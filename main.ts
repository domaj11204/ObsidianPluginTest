import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import path from 'path';
import { PersistExtension, renderTemplate,  } from './obsidian-zotero-integration/bbt/template.env';
import {
	appendExportDate,
	getTemplates,
  } from './obsidian-zotero-integration/bbt/template.helpers';



// Remember to rename these classes and interfaces!


interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}


export default class TestPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		var url = "ws://" + "127.0.0.1" + ":27709/obsidian";
		var websocket = new WebSocket(url);
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		this.addRibbonIcon('dice', '連線', () => {
			

			console.log(url)
			websocket = new WebSocket(url);
			websocket.onopen = websocketOnOpen;
			websocket.onerror = websocketOnError;
			websocket.onclose = websocketOnClose;
			websocket.onmessage = websocketOnMessage;
		  });
		
		this.addRibbonIcon('dice', '傳訊', () => {
			console.log("準備發出AAA")
			websocket.send("AAAA");	
			console.log("發送完畢")
		});	

		this.addRibbonIcon('dice', 'Test', () => {
			
			const files = this.app.vault.getMarkdownFiles();
			console.log(files);
			this.app.vault.create("123.md", "AAA")
			//this.app.vault.append(file, )
		});	

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		//以下是關於websocket會呼叫的函數
		function websocketOnOpen(event:any): void{
			console.log(event);
		};
		function websocketOnError(event:any): void{
			console.log(event);
			console.log("error")
		};
		function websocketOnMessage(event:any): any{
			console.log("OnMessage:");
			console.log(event.data);
			var data = JSON.parse(event.data)
			console.log(data)
			console.log(data["predicate"])
			if (data["predicate"] == "ImportGithub"){
				const [author, projectName] = githubUrlParse(data["object"]["pageURL"]);
				createNewNote(author, projectName, data["object"]["pageURL"]);
			}
			return false;
		};
		function websocketOnClose(event:any): void{
			console.log(event.data);
			console.log("OnClose")
		};
	}

	onunload() {
		console.log('unloading plugin')
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: TestPlugin;

	constructor(app: App, plugin: TestPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
async function createNewNote(author:string, projectName:string, URL:string) {
	const templateData = {
		"author": author,
		"projectName": projectName,
		"URL":URL
	};
	const rendered = await renderTemplates(
        PersistExtension.prepareTemplateData(templateData, ''),
        ''
	);

	if (!rendered) return [];

	const markdownPath = "未命名/" + projectName + ".md"
	

	const existingMarkdownFile =
        app.vault.getAbstractFileByPath(markdownPath);
	let existingMarkdown = '';
	if (existingMarkdownFile) {
		existingMarkdown = await app.vault.cachedRead(
			existingMarkdownFile as TFile
		);
		this.app.workspace.getLeaf(true).openFile(existingMarkdownFile as TFile);
	} 
	else {
		await mkMDDir(markdownPath);
		app.vault.create(markdownPath, rendered);
	}
	
	
}

async function renderTemplates(
	templateData: Record<any, any>,
	existingAnnotations: string,
	shouldThrow?: boolean
	) {
	const params = {"exportFormat":{
						"templatePath": "templete/模板-git.md"
						}	
					};
	const { template } =
		await getTemplates(params);

	if (!template) {
		throw new Error(
		`No templates found for export ${params}`
		);
	}
	const templatePath = "templete/模板-git.md"
	let main = '';
	let hasPersist = false;

	if (template) {
		try {
		main = await renderTemplate(
			templatePath,
			template,
			templateData
		);
		hasPersist = PersistExtension.hasPersist(main);
		} catch (e) {
		if (shouldThrow) {
			throw errorToHelpfulError(
			e,
			templatePath,
			template
			);
		} else {
			errorToHelpfulNotification(
			e,
			templatePath,
			template
			);
			return false;
		}
		}

		return hasPersist ? appendExportDate(main) : main;
	}
}

async function mkMDDir(mdPath: string) {
	const dir = path.dirname(mdPath);
  
	if (await app.vault.adapter.exists(dir)) return;
  
	await app.vault.createFolder(dir);
}

function errorToHelpfulError(e: Error, templatePath: string, template: string) {
	return new Error(
	  `Error parsing template "${templatePath}": ${generateHelpfulTemplateError(
		e,
		template
	  )}`
	);
}

function generateHelpfulTemplateError(e: Error, template: string) {
	const message = e.message;
  
	try {
	  if (message) {
		const match = message.match(/\[Line (\d+), Column (\d+)]/);
  
		if (match) {
		  const lines = template.split(/\n/g);
		  const line = lines[Number(match[1]) - 1];
		  const indicator = ' '.repeat(Number(match[2]) - 1) + '^';
  
		  return `${message}\n\n${line}\n${indicator}`;
		}
	  }
	} catch {
	  //
	}
  
	return message;
}

function errorToHelpfulNotification(
	e: Error,
	templatePath: string,
	template: string
  ) {
	new Notice(
	  createFragment((f) => {
		f.createSpan({
		  text: `Error parsing template "${templatePath}": `,
		});
		f.createEl('code', {
		  text: generateHelpfulTemplateError(e, template),
		});
	  }),
	  10000
	);
}

function githubUrlParse(URL:string){
	const list = URL.split("/")
	console.log("list:", list)
	return [list[3], list[4]]
}