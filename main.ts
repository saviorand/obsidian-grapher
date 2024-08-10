import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GrapherSettings {
	pythonPath: string;
	openAiKey: string;
	anthropicKey: string;
}

const DEFAULT_SETTINGS: GrapherSettings = {
	pythonPath: '/usr/bin/python3',
	openAiKey: '',
	anthropicKey: ''
}

export default class Grapher extends Plugin {
	settings: GrapherSettings;
	basePath = (this.app.vault.adapter as any).basePath;
	scriptBasePath =  `${this.basePath}/${this.app.vault.configDir}/plugins/obsidian-grapher/src`;
	scriptFileToTextPath = `${this.scriptBasePath}/file_to_text.py`;
	scriptTextToPrologPath = `${this.scriptBasePath}/text_to_prolog.py`;
	scriptPrologToFolderPath = `${this.scriptBasePath}/prolog_to_folder.py`;

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
		if (this.settings.openAiKey === '') {
			this.showNotice('OpenAI API key is not set. Please set it in the plugin settings.');
			return false;
		}
		if (this.settings.anthropicKey === '') {
			this.showNotice('Anthropic API key is not set. Please set it in the plugin settings.');
			return false;
		}
		return true;
	};

	private createGeneratedFolders(generatedBasePath: string) {
		const generatedDir = generatedBasePath + '/generated/';
		const folderOutputPath = generatedBasePath + '/graph/';
		fs.mkdirSync(generatedDir, { recursive: true });

		return {folderOutputPath, generatedDir};
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
			  await this.spawnPythonProcessAsync(this.scriptTextToPrologPath, textOutputPath, prologOutputPath);
			  this.showNotice('Text to Prolog conversion completed');
			}
			if (prologOutputPath && folderOutputPath) {
			  await this.spawnPythonProcessAsync(this.scriptPrologToFolderPath, prologOutputPath, folderOutputPath);
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
			await this.spawnPythonProcessAsync(this.scriptFileToTextPath, fullFilePath, textOutputPath);
			this.showNotice('File to Text conversion completed');
		  }
		  if (prologOutputPath) {
			await this.spawnPythonProcessAsync(this.scriptTextToPrologPath, textOutputPath, prologOutputPath);
			this.showNotice('Text to Prolog conversion completed');
		  }
		  if (folderOutputPath) {
			await this.spawnPythonProcessAsync(this.scriptPrologToFolderPath, prologOutputPath, folderOutputPath);
			this.showNotice('Prolog to Folder conversion completed');
		  }
		  this.showNotice('Your graph is ready!');
		} catch (error) {
		  this.showNotice('An error occurred during the graph generation: ' + error);
		}
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

	  private showNotice(message: string) {
		new Notice(message);
	  }
	  

	onunload() {

	}

	private async saveKeysToEnvFile() {
		const envPath = `${this.scriptBasePath}/.env`;
		fs.writeFileSync(envPath, `OPENAI_API_KEY=${this.settings.openAiKey}\nANTHROPIC_API_KEY=${this.settings.anthropicKey}`);
	};

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.saveKeysToEnvFile();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.saveKeysToEnvFile();
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
		
		// button should be activated with enter key - dangerous? is eventlistener ever removed?
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				this.close();
				this.onSubmit(this.result);
			}
		});
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

		new Setting(containerEl)
			.setName('Python Path')
			.setDesc('Path to the Python executable on your system')
			.addText(text => text
				.setPlaceholder('/usr/bin/python3')
				.setValue(this.plugin.settings.pythonPath)
				.onChange(async (value) => {
					this.plugin.settings.pythonPath = value;
					await this.plugin.saveSettings();
				}));
		
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
