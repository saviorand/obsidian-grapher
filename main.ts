import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { LLMClient, callClaudeApi, callGptApi } from './src/llm';
import { chunkText } from "src/chunking";
import { defaultOntology, arityTwoPrompt } from './src/prompts';
import { createFoldersAndFiles, parseProlog } from './src/prolog_to_folder';
import { fileToText } from './src/file_to_text';
import { ontologyContainerStyles } from './src/styles/styles';

enum llmEngine {
	OPENAI = 'openai',
	ANTHROPIC = 'anthropic'
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
	chunkSize: 2000
}

export default class Grapher extends Plugin {
	settings: GrapherSettings;
	basePath = (this.app.vault.adapter as any).basePath;

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

	private createGeneratedFolders(generatedBasePath: string) {
		const folderOutputPath = generatedBasePath;
		const generatedDir = generatedBasePath + '/generated/';
		fs.mkdirSync(generatedDir, { recursive: true });

		return {folderOutputPath, generatedDir};
	}

	async textToProlog(text: string, prologOutputPath: string): Promise<void> {
		if (text.length === 0) {
			this.showNotice('The text is empty');
		}
		const chunks = chunkText(text, this.settings.chunkSize);
		return await this.textChunksToPrologRelations(chunks, prologOutputPath);
	}

	async prologToFolder(filePath: string, folderOutputPath: string) {	
		const [arity1Predicates, arity2Predicates] = parseProlog(filePath);
		createFoldersAndFiles(arity2Predicates, folderOutputPath, this.settings.parentRelations, this.settings.childRelations);
	}

	cleanGPTPrologCodeBlocks(text: string) {
		return text.replace(/```prolog/g, '').replace(/```/g, '');
	};

	async textChunksToPrologRelations(textChunks: string[], prologOutputPath: string) {
		const llmClient = this.initializeLLMClient();

		try {
			for (let i = 0; i < textChunks.length; i++) {
				this.showNotice(`Processing chunk ${i + 1} of ${textChunks.length}`);
				const chunk = textChunks[i];
				let chunkPrologRelations = null;
				if (this.settings.llmEngine === llmEngine.OPENAI) {
					try	{
						chunkPrologRelations = await callGptApi(llmClient as OpenAI, this.settings.modelName, chunk, arityTwoPrompt(this.settings.ontology));
						if (chunkPrologRelations === null || chunkPrologRelations === '') {
							throw new Error('Empty response from OpenAI');
						}
						chunkPrologRelations = this.cleanGPTPrologCodeBlocks(chunkPrologRelations);
					} catch (error) {
						this.showNotice('An error occurred during entity extraction: ' + error);
					}
				} else if (this.settings.llmEngine === llmEngine.ANTHROPIC) {
					try {
						chunkPrologRelations = await callClaudeApi(this.settings.anthropicKey, this.settings.modelName, chunk, arityTwoPrompt(this.settings.ontology));
						if (chunkPrologRelations === null || chunkPrologRelations === '') {
							throw new Error('Empty response from Anthropic');
						}
					  } catch (error) {
						console.error('An error occurred during entity extraction:', error);
						this.showNotice('An error occurred during entity extraction: ' + error);
						fs.appendFileSync(prologOutputPath, `Error: ${error}\n`);
					  }
					}
				if (chunkPrologRelations) {
				fs.appendFileSync(prologOutputPath, chunkPrologRelations);
				}
			}
		} catch (error) {
			this.showNotice('An error occurred during entity extraction: ' + error);
		}
	}

	async generateGraphFromText(text: string, filePath: string) {
		this.showNotice('Processing your text...');

		const fullFilePath = this.basePath + '/' + filePath;
		const generatedBaseDir = fullFilePath.substring(0, fullFilePath.lastIndexOf('/'))
		
		const clippingName = text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
		const clippingDirName = generatedBaseDir + '/' + clippingName
		
		const {folderOutputPath, generatedDir} = this.createGeneratedFolders(clippingDirName);
		
		const prologOutputPath = path.join(generatedDir, 'content.pl');
		const textOutputPath = path.join(generatedDir, 'content.txt');
		fs.writeFileSync(textOutputPath, text);
		
		this.showNotice(`File written successfully to: ${textOutputPath}`);

		try {
			if (prologOutputPath) {
			  await this.textToProlog(text, prologOutputPath);
			  this.showNotice('Text to Prolog conversion completed');
			}
			if (prologOutputPath && folderOutputPath) {
			  await this.prologToFolder(prologOutputPath, folderOutputPath);
			  this.showNotice('Prolog to Folder conversion completed');
			}
			this.showNotice('Your graph is ready!');
		  } catch (error) {
			this.showNotice('An error occurred during the graph generation: ' + error);
		  }	  
	}

	async generateGraphFromFile(filePath: string) {
		this.showNotice('Processing: ' + filePath);
		
		const fullFilePath = this.basePath + '/' + filePath;
		const generatedBaseDir = fullFilePath.substring(0, fullFilePath.lastIndexOf('/'))
		const fileDirName = generatedBaseDir + '/' + path.basename(filePath, path.extname(filePath));
		
		const {folderOutputPath, generatedDir} = this.createGeneratedFolders(fileDirName);
		
		const prologOutputPath = path.join(generatedDir, 'content.pl');
		const textOutputPath = path.join(generatedDir, 'content.txt');
	  
		try {
		  if (textOutputPath) {
			const text = await fileToText(fullFilePath);
			fs.writeFileSync(textOutputPath, text);
			this.showNotice('File to Text conversion completed');
		  }
		  if (prologOutputPath) {
			const textContent = fs.readFileSync(textOutputPath, 'utf8')
			await this.textToProlog(textContent, prologOutputPath);
			this.showNotice('Text to Prolog conversion completed');
		  }
		  if (folderOutputPath) {
			await this.prologToFolder(prologOutputPath, folderOutputPath);
			this.showNotice('Prolog to Folder conversion completed');
		  }
		  this.showNotice('Your graph is ready!');
		} catch (error) {
		  this.showNotice('An error occurred during the graph generation: ' + error);
		}
	  }
	  
	  private showNotice(message: string) {
		console.log(message);
		new Notice(message);
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
	}
}
