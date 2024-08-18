import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { LLMClient, callClaudeApi, callGptApi } from './src/llm';
import { chunkText } from "src/chunking";
import { defaultOntology, arityTwoPrompt, titlePrompt } from './src/prompts';
import { createFoldersAndFiles, parsePrologPredicates } from './src/prolog_to_folder';
import { fileToText } from './src/file_to_text';
import { ontologyContainerStyles } from './src/styles/styles';

enum llmEngine {
	OPENAI = 'openai',
	ANTHROPIC = 'anthropic'
}

type EngineHandler = () => Promise<string>;

enum parserEngine {
	DEFAULT = 'default',
	UNSTRUCTURED = 'unstructured'
}

interface GrapherSettings {
	llmEngine: llmEngine;
	modelName: string;
	ontology: string;
	parentRelations: string;
	childRelations: string;
	openAiKey: string;
	anthropicKey: string;
	chunkSize: number;
	parserEngine: parserEngine;
	pythonPath: string;
}

const DEFAULT_ANTHROPIC_MODEL_NAME = "claude-3-5-sonnet-20240620";
const DEFAULT_OPEN_AI_MODEL_NAME = "gpt-4o-mini";

const DEFAULT_SETTINGS: GrapherSettings = {
	llmEngine: llmEngine.ANTHROPIC,
	modelName: DEFAULT_ANTHROPIC_MODEL_NAME,
	ontology: '',
	parentRelations: 'has part',
	childRelations: 'part of',
	openAiKey: '',
	anthropicKey: '',
	chunkSize: 2000,
	parserEngine: parserEngine.DEFAULT,
	pythonPath: '/usr/bin/python3'
}

export default class Grapher extends Plugin {
	settings: GrapherSettings;
	basePath = (this.app.vault.adapter as any).basePath;
	pythonScriptsBasePath =  `${this.basePath}/${this.app.vault.configDir}/plugins/obsidian-grapher/src/python`;
	pythonScriptFileToTextPath = `${this.pythonScriptsBasePath}/file_to_text.py`;

	async onload() {
	  	await this.loadSettings();
	
		this.addSettingTab(new BasicSettingsTab(this.app, this));

	    this.addCommand({
			id: 'process-selected-text',
			name: 'Process Selected Text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					if (view.file) {
						this.checkAPIKeys() &&
						this.generateGraphFromText(selectedText, view.file.path);
					}
				}
			}
		});
		this.addCommand({
			id: 'input-and-process-text',
			name: 'Input and Process Text',
			callback: () => {
				new TextInputModal(this.app, (result) => {
					if (result) {
						const activeFile = this.app.workspace.getActiveFile();
						if (activeFile) {
							this.checkAPIKeys() &&
							this.generateGraphFromText(result, activeFile.path);
						} else {
							this.showNotice("No active file. Please open a file before running this command.");
						}
					}
				}).open();
			},
		});
		this.addCommand({
			id: 'process-current-file',
			name: 'Process Current File',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					this.checkAPIKeys() &&
					this.generateGraphFromFile(activeFile.path);
				} else {
					this.showNotice("No active file. Please open a file before running this command.");
			}}
		})		
	}

	private checkAPIKeys() {
		if (this.settings.llmEngine === llmEngine.OPENAI && this.settings.openAiKey === '') {
			this.showNotice('Please enter your OpenAI API key in the settings.');
			return false;
		}
		if (this.settings.llmEngine === llmEngine.ANTHROPIC && this.settings.anthropicKey === '') {
			this.showNotice('Please enter your Anthropic API key in the settings.');
			return false;
		}
		return true;
	};

	private initializeLLMClient() {
		let llmClient: LLMClient;
		if (this.settings.llmEngine === llmEngine.OPENAI) {
			if (this.settings.modelName === DEFAULT_ANTHROPIC_MODEL_NAME) {
				this.settings.modelName = DEFAULT_OPEN_AI_MODEL_NAME
			}
			return llmClient = new OpenAI({
				apiKey: this.settings.openAiKey,
				dangerouslyAllowBrowser: true
			});
		} else if (this.settings.llmEngine === llmEngine.ANTHROPIC) {
			console.info('Using the Anthropic API directly');
		} else {
			this.showNotice("Could not initialize LLM Client, unknown LLM type")
		}
	}

	async textToChunks(text: string): Promise<string[]> {
		if (text.length === 0) {
			this.showNotice('The text is empty');
		}
		return chunkText(text, this.settings.chunkSize);
	}

	async chunksToGraph(chunks: string[], outputPath: string): Promise<void> {	
		const llmClient = this.initializeLLMClient() as LLMClient;
		const fileName = path.basename(outputPath, path.extname(outputPath));
		const fullPrologOutputPath = path.join(outputPath, fileName + '.pl');		
		
		for (let i = 0; i < chunks.length; i++) {
			this.showNotice(`Processing chunk ${i + 1} of ${chunks.length}`);
			const chunk = chunks[i];

			try {
				const chunkTitle = await this.generateTitleFromText(llmClient, chunk);
				if (chunkTitle === '') {
					this.showNotice('Empty response from the LLM');
				}

				const chunkFolderName = chunkTitle.replace(/[^a-zA-Z0-9: ]/g, '_');
				const chunkTextFileName = chunkTitle + '.txt';
				const chunkPrologFileName = chunkTitle + '.pl';
				const chunkMdFileName = chunkTitle + '.md';

				const chunkOutputPath = path.join(outputPath, chunkFolderName);
				fs.mkdirSync(chunkOutputPath, { recursive: true });

				const chunkMdOutputPath = path.join(chunkOutputPath, chunkMdFileName);
				fs.writeFileSync(chunkMdOutputPath, `\n%% Waypoint %%`);
				
				const chunkTextOutputPath = path.join(chunkOutputPath, chunkTextFileName);
				fs.writeFileSync(chunkTextOutputPath, chunk);
				this.showNotice(`Chunk saved to: ${chunkFolderName}`);
				
				const chunkPrologOutputPath = path.join(chunkOutputPath, chunkPrologFileName);
				let chunkPrologRelations = await this.textToPrologRelations(llmClient, chunk);;
				if (chunkPrologRelations === '') {
					this.showNotice('Empty response from the LLM');
				}
				fs.appendFileSync(fullPrologOutputPath, chunkPrologRelations);
				fs.appendFileSync(chunkPrologOutputPath, chunkPrologRelations);
				this.showNotice('Prolog relations saved to: ' + chunkTextFileName);

				const [arity1Predicates, arity2Predicates] = parsePrologPredicates(chunkPrologRelations);
				createFoldersAndFiles(arity2Predicates, chunkOutputPath, this.settings.parentRelations, this.settings.childRelations);	
				this.showNotice('Graph files saved to: ' + chunkFolderName);
			} catch (error) {
				this.showNotice('An error occurred during the text to Prolog conversion: ' + error);
			}
		}
		return Promise.resolve();
	}

	cleanLLMPrologOutput(text: string) {
		return text.replace(/```prolog/g, '').replace(/```/g, '').replace(/'/g, '');
	};

	async textToPrologRelations(client: LLMClient, text: string): Promise<string> {
		const { llmEngine, modelName, ontology, anthropicKey } = this.settings;
	  
		const engineHandlers: { [K in llmEngine]: EngineHandler } = {
			'openai': async () => {
			  const raw_relations = await callGptApi(client as OpenAI, modelName, text, arityTwoPrompt(ontology));
			  if (!raw_relations) {
				throw new Error(`Empty response from ${llmEngine}`);
			  }
			  return this.cleanLLMPrologOutput(raw_relations);
			},
			'anthropic': async () => {
			  const raw_relations = await callClaudeApi(anthropicKey, modelName, text, arityTwoPrompt(ontology));
			  if (!raw_relations) {
				throw new Error(`Empty response from ${llmEngine}`);
			  }
			  return this.cleanLLMPrologOutput(raw_relations);
			}
		  };
	  
		  const handler = engineHandlers[llmEngine];
		  if (!handler) {
			throw new Error(`Unsupported LLM engine: ${llmEngine}`);
		  }
	  
		  const result = await handler();
		  if (!result) {
			throw new Error(`Empty response from ${llmEngine}`);
		  }
	  
		  return result;
	}

	async generateTitleFromText(client: LLMClient, text: string): Promise<string> {
		const { llmEngine, modelName, anthropicKey } = this.settings;

		const engineHandlers: { [K in llmEngine]: EngineHandler } = {
			'openai': async () => {
				const gptResponse = await callGptApi(client as OpenAI, modelName, text, titlePrompt);
				if (!gptResponse) {
					throw new Error(`Empty response from ${llmEngine}`);
				}
				return gptResponse;
			},
			'anthropic': async () => {
				return await callClaudeApi(anthropicKey, modelName, text, titlePrompt);
			}
		};

		const handler = engineHandlers[llmEngine];
		if (!handler) {
			throw new Error(`Unsupported LLM engine: ${llmEngine}`);
		}

		const result = await handler();
		if (!result) {
			throw new Error(`Empty response from ${llmEngine}`);
		}

		return result;
	}

	async generateGraphFromText(text: string, filePath: string) {
		this.showNotice('Processing your text...');

		const fullFilePath = this.basePath + '/' + filePath;
		const generatedBaseDir = fullFilePath.substring(0, fullFilePath.lastIndexOf('.'));
		fs.mkdirSync(generatedBaseDir, { recursive: true });

		if (generatedBaseDir) {
			const fileName = path.basename(fullFilePath, path.extname(fullFilePath));
			const textOutputPath = path.join(generatedBaseDir, fileName + '.txt');
			fs.writeFileSync(textOutputPath, text);
			
			try {
			  await this.chunksToGraph([text], generatedBaseDir);
			  this.showNotice('Your graph is ready!');
			} catch (error) {
			this.showNotice('An error occurred during the graph generation: ' + error);
		  }	 
		} 
	}

	async generateGraphFromFile(filePath: string) {
		this.showNotice('Processing: ' + filePath);
		
		const fullFilePath = this.basePath + '/' + filePath;
		const fileName = path.basename(fullFilePath, path.extname(fullFilePath));
		const generatedBaseDir = fullFilePath.substring(0, fullFilePath.lastIndexOf('.'))
		const textOutputPath = path.join(generatedBaseDir, fileName + '.txt');
		const chunkMdFileName = fileName + '.md';

		if (generatedBaseDir) {
			try {
				let textContent = '';
				if (this.settings.parserEngine === parserEngine.DEFAULT) {
					textContent = await fileToText(fullFilePath);
					fs.writeFileSync(textOutputPath, textContent);
				} else if (this.settings.parserEngine === parserEngine.UNSTRUCTURED) {
					await this.spawnPythonProcessAsync(this.pythonScriptFileToTextPath, fullFilePath, textOutputPath);
					textContent = fs.readFileSync(textOutputPath, 'utf8')
				}	
				this.showNotice('File to Text conversion completed');
				
				const chunks = await this.textToChunks(textContent);
				this.showNotice('Text to Chunks conversion completed');
				
				const chunkMdOutputPath = path.join(generatedBaseDir, chunkMdFileName);
				fs.writeFileSync(chunkMdOutputPath, `\n%% Waypoint %%`);

				await this.chunksToGraph(chunks, generatedBaseDir);
				this.showNotice('Your graph is ready!');
			} catch (error) {
				this.showNotice('An error occurred during graph generation: ' + error);
			}
		}
	  }
	  
	  private showNotice(message: string) {
		console.log(message);
		new Notice(message);
	  }
	  
	  private spawnPythonProcessAsync(scriptPath: string, inputPath: string, outputPath: string): Promise<void> {
		return new Promise((resolve, reject) => {

		  const pythonPath = this.settings.pythonPath;
		  if (pythonPath === '' || !fs.existsSync(pythonPath)) {
			reject(new Error(`Python executable not found at ${pythonPath}`));
		  }
		  const process = spawn(pythonPath, [scriptPath, inputPath, outputPath]);

		  process.on('close', (code) => {
			if (code === 0) {
			  resolve();
			} else {
			  reject(new Error(`Python process exited with code ${code}`));
			}
		  });

		  process.on('error', (err) => {
			reject(err);
		  });

		  process.stdout.on('data', (data) => {
			this.showNotice(`${data}`);
		  });
		});
	  }
	
	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TextInputModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;
  
	constructor(app: App, onSubmit: (result: string) => void) {
	  super(app);
	  this.onSubmit = onSubmit;
	}
  
	onOpen() {
	  const { contentEl } = this;
  
	  contentEl.createEl("h1", { text: "Enter your text" });
  
	  new Setting(contentEl)
		.setName("Input")
		.addText((text) =>
		  text.onChange((value) => {
			this.result = value
		  }));
  
	  new Setting(contentEl)
		.addButton((btn) =>
		  btn
			.setButtonText("Submit")
			.setCta()
			.onClick(() => {
			  this.close();
			  this.onSubmit(this.result);
			}));
		
		// TODO: button should be activated with enter key - dangerous? is eventlistener ever removed?
		// document.addEventListener('keydown', (event) => {
		// 	if (event.key === 'Enter') {
		// 		this.close();
		// 		this.onSubmit(this.result);
		// 	}
		// });
	}
  
	onClose() {
	  const { contentEl } = this;
	  contentEl.empty();
	}
  }
  

class BasicSettingsTab extends PluginSettingTab {
	plugin: Grapher;

	constructor(app: App, plugin: Grapher) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: 'Grapher Settings'});
		containerEl.createEl('p', {text: 'Configure the settings for the Grapher plugin.'});
		
		containerEl.createEl('h3', {text: 'LLM Settings'});
		new Setting(containerEl)
			.setName('LLM Engine')
			.setDesc('Choose the language model engine to use')
			.addDropdown(dropdown => dropdown
				.addOptions({
					[llmEngine.OPENAI]: 'OpenAI',
					[llmEngine.ANTHROPIC]: 'Anthropic'
				})
				.setValue(this.plugin.settings.llmEngine)
				.onChange(async (value) => {
					this.plugin.settings.llmEngine = value as llmEngine;
					await this.plugin.saveSettings();
				}));
			
		new Setting(containerEl)
			.setName('LLM Model')
			.setDesc('Model of the LLM to use')
			.addText(text => text
				.setPlaceholder(DEFAULT_ANTHROPIC_MODEL_NAME)
				.setValue(this.plugin.settings.modelName)
				.onChange(async (value) => {
					this.plugin.settings.modelName = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Chunk Size')
			.setDesc('Size of the text chunks to send to the LLM')
			.addText(text => text
				.setPlaceholder('2000')
				.setValue(this.plugin.settings.chunkSize.toString())
				.onChange(async (value) => {
					this.plugin.settings.chunkSize = parseInt(value);
					await this.plugin.saveSettings();
				}));
		
		containerEl.createEl('h3', {text: 'Ontology'});
		const ontologyContainer = containerEl.createDiv({cls: 'ontology-container'});
		ontologyContainer.createEl('style', {
			text: ontologyContainerStyles
		});

		const titleDescContainer = ontologyContainer.createDiv({cls: 'title-desc-container'});
		titleDescContainer.createSpan({text: 'Ontology', cls: 'setting-item-name'});
		titleDescContainer.createSpan({text: 'Entities and relations ontology in free text format (can be a list)', cls: 'setting-item-description'});

		new Setting(ontologyContainer)
		.addTextArea(text => text
			.setPlaceholder(defaultOntology)
			.setValue(this.plugin.settings.ontology)
			.onChange(async (value) => {
				this.plugin.settings.ontology = value;
				await this.plugin.saveSettings();
			}));
		
		new Setting(containerEl)
			.setName('Parent Relations')
			.setDesc('Comma-separated list of parent relations')
			.addText(text => text
				.setPlaceholder('has part')
				.setValue(this.plugin.settings.parentRelations)
				.onChange(async (value) => {
					this.plugin.settings.parentRelations = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Child Relations')
			.setDesc('Child relations')
			.addText(text => text
				.setPlaceholder('part of, category')
				.setValue(this.plugin.settings.childRelations)
				.onChange(async (value) => {
					this.plugin.settings.childRelations = value;
					await this.plugin.saveSettings();
				}));
		
		containerEl.createEl('h3', {text: 'API Keys'});
		
		new Setting(containerEl)
		.setName('OpenAI API Key')
		.setDesc('API key for OpenAI')
		.addText(text => text
			.setPlaceholder('sk-...')
			.setValue(this.plugin.settings.openAiKey)
			.onChange(async (value) => {
				this.plugin.settings.openAiKey = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Anthropic API Key')
		.setDesc('API key for Anthropic')
		.addText(text => text
			.setPlaceholder('sk-...')
			.setValue(this.plugin.settings.anthropicKey)
			.onChange(async (value) => {
				this.plugin.settings.anthropicKey = value;
				await this.plugin.saveSettings();
			}));

		containerEl.createEl('h3', {text: 'Parser Settings'});
		new Setting(containerEl)
			.setName('Parser Engine')
			.setDesc('Choose the parsing method to use to extract PDFs and other files to text before processing')
			.addDropdown(dropdown => dropdown
				.addOptions({
					[parserEngine.DEFAULT]: 'Default',
					[parserEngine.UNSTRUCTURED]: 'Unstructured'
				})
				.setValue(this.plugin.settings.parserEngine)
				.onChange(async (value) => {
					this.plugin.settings.parserEngine = value as parserEngine;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Python Path')
			.setDesc('Path to the Python executable')
			.addText(text => text
				.setPlaceholder('/usr/bin/python3')
				.setValue(this.plugin.settings.pythonPath)
				.onChange(async (value) => {
					this.plugin.settings.pythonPath = value;
					await this.plugin.saveSettings();
				}));
	}
}
