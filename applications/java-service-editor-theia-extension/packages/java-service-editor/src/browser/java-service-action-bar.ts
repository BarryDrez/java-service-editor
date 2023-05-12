import('@builtioflow/origin-shared-components/styles.css');

import { MessageService } from '@theia/core';
import { SelectComponent, SelectOption } from '@theia/core/lib/browser/widgets/select-component';
import { escapeInvisibleChars } from '@theia/core/lib/common/strings';
import * as React from '@theia/core/shared/react';
import { createRoot, Root } from '@theia/core/shared/react-dom/client';
import { Widget, Panel } from '@phosphor/widgets';
import { injectable } from '@theia/core/shared/inversify';
import { CommandRegistry, Disposable, DisposableCollection, MenuModelRegistry } from '@theia/core/lib/common';
import { nls } from '@theia/core/lib/common/nls';
import { OutlineViewService } from '@theia/outline-view/lib/browser/outline-view-service';
import { CommonCommands, CompositeTreeNode, SelectableTreeNode, ContextMenuRenderer, HoverService } from '@theia/core/lib/browser';
import { EditorCommands } from '@theia/editor/lib/browser';
import { JavaServiceOutlineSymbolInformationNode } from './outline/java-service-outline-contribution';
import { BreakpointManager } from '@theia/debug/lib/browser/breakpoint/breakpoint-manager';
import { ServiceConfig } from '../common/java-service-config';
import { handleError } from './utils/java-service-utils';
import {
	JavaServiceSaveContextMenu, JavaServiceHelpContextMenu, JavaServiceDebugContextMenu,
	JavaServiceEditActionsSourceContextMenu, JavaServiceEditActionsOutlineContextMenu,
	JavaServiceMoreContextMenu
} from './java-service-command-contribution';
import { JavaServiceCommands } from './java-service-commands';
import { InvokeBackendService } from '../common/protocol';
import { JavaServiceInfo } from '../common/java-service-info';

const DIRTY_INDICATOR = '* ';
const RESULTS = 'results';

@injectable()
export class JavaServiceActionBar extends Panel implements Disposable {

	protected readonly initialHistoryLength: number;
	protected commandRegistry: CommandRegistry;
	protected menuModelRegistry: MenuModelRegistry;
	protected outlineViewService: OutlineViewService;
	protected contextMenuRenderer: ContextMenuRenderer;
	protected breakpointManager: BreakpointManager;

	protected readonly toDispose = new DisposableCollection();

	selectedJSNode: JavaServiceOutlineSymbolInformationNode;

	searchLink: HTMLElement;
	debugLink: HTMLElement;
	runLink: HTMLElement;
	ioLink: HTMLElement;
	logBDLink: HTMLElement;
	navLink: HTMLElement;
	toggleOutlineViewLink: HTMLElement;
	deleteLink: HTMLElement;
	editLink: HTMLElement;
	undoLink: HTMLElement;
	redoLink: HTMLElement;
	newJavaServiceLink: HTMLElement;
	saveLink: HTMLElement;
	compileLink: HTMLElement;
	refreshLink: HTMLElement;
	helpLink: HTMLElement;
	moreLink: HTMLElement;

	isEditorEnabled = false;

	isJavaServiceSelectedInOutlineView = false;
	isRootSelectedInOutlineView = false;

	edgeServers: SelectOption[] = [];
	edgeServerDetails: any = [];

	protected readonly selectComponent = React.createRef<SelectComponent>();
	// protected interactable: InteractableType;

	constructor(private invokeBackendService: InvokeBackendService, private messageService: MessageService,
		private hoverService: HoverService) {

		super({});
		this.id = 'java-service-action-bar';
		this.handleGetJavaServiceInfo().then(() => {
			if (ServiceConfig.javaSuiteName && ServiceConfig.javaSuiteName.length > 0) {
				this.getEdgeServers().then(() => {
					this.createContents();
				});
			}
		});
	}

	init1(commandRegistry: CommandRegistry, menuModelRegistry: MenuModelRegistry,
		outlineViewService: OutlineViewService, contextMenuRenderer: ContextMenuRenderer,
		breakpointManager: BreakpointManager): void {

		this.commandRegistry = commandRegistry;
		this.menuModelRegistry = menuModelRegistry;
		this.outlineViewService = outlineViewService;
		this.contextMenuRenderer = contextMenuRenderer;
		this.breakpointManager = breakpointManager;

		this.toDispose.push(this.outlineViewService.onDidSelect(async node => {
			this.setSelectedJavaService([node.parent], true);
		}));

		this.toDispose.push(this.outlineViewService.onDidChangeOutline(async node => {
			this.setSelectedJavaService(node, false);
		}));
	}

	createContents(): void {

		const infoBar = new Panel();
		infoBar.id = 'java-service-info-bar';

		const goBackLink = document.createElement('a');
		goBackLink.href = '';
		goBackLink.classList.add('go-back-button');
		goBackLink.classList.add('dlt-icon-arrow-left');
		goBackLink.addEventListener('click', this.goBack.bind(this));
		goBackLink.setAttribute('aria-label', nls.localize('action.bar.back.to.project.text', 'Return to project {0}', ServiceConfig.projectName));
		goBackLink.onmouseenter = this.showTooltip.bind(this, goBackLink, 'right');

		const wid1 = new Widget({ node: goBackLink });
		wid1.removeClass('p-Widget');
		infoBar.addWidget(wid1);

		const titleDiv = document.createElement('div');

		const wid2 = new Widget({ node: titleDiv });
		wid2.removeClass('p-Widget');
		infoBar.addWidget(wid2);

		const titleH2 = document.createElement('h2');
		titleH2.id = 'JavaSuiteTitle';
		titleH2.textContent = ServiceConfig.javaSuiteTitle;
		titleH2.classList.add('js-title');

		titleDiv.appendChild(titleH2);

		const descDiv = document.createElement('div');
		descDiv.id = 'java-service-desc';
		descDiv.classList.add('js-div');

		const wid3 = new Widget({ node: descDiv });
		wid3.removeClass('p-Widget');
		infoBar.addWidget(wid3);

		this.addWidget(infoBar);

		const actionListBar = new Panel();
		actionListBar.id = 'java-service-action-list-bar';

		this.searchLink = this.addActionBarItem('action.bar.search.text', 'Search', 'bottom', 'dlt-icon-search', true, false, actionListBar, 'Search');
		this.searchLink.addEventListener('click', this.find.bind(this));

		this.addEdgeServerDropdown(actionListBar);

		// this.debugLink = this.addActionBarItem('action.bar.debug.text', 'Debug', 'dlt-icon-bug', false, true, actionListBar);
		// this.debugLink.addEventListener('click', this.debugJavaService.bind(this));

		this.runLink = this.addActionBarItem('action.bar.run.text', 'Run', 'bottom', 'dlt-icon-play-circle', false, false, actionListBar, 'Run');
		this.runLink.addEventListener('click', this.runJavaService.bind(this));
		this.runLink.classList.add('disabled');

		this.ioLink = this.addActionBarItem('action.bar.define.io.text', 'Define I/O', 'bottom', 'ut-icon-action-bar_io', false, false, actionListBar, 'Define I/O');
		this.ioLink.addEventListener('click', this.inputOutputSignature.bind(this));
		this.ioLink.classList.add('disabled');

		this.logBDLink = this.addActionBarItem('action.bar.log.business.data.text', 'Log business data', 'bottom', 'dlt-icon-document', true, false, actionListBar, 'Log Business Data');
		this.logBDLink.addEventListener('click', this.logBusinessData.bind(this));
		this.logBDLink.classList.add('disabled');

		this.navLink = this.addActionBarItem('action.bar.navigator.text', 'Navigator', 'bottom', 'ut-icon-action-bar_navigator', false, false, actionListBar, 'Navigator');
		this.navLink.addEventListener('click', this.toggleMinimap.bind(this));

		this.toggleOutlineViewLink = this.addActionBarItem('action.bar.toggle.outline.view.text', 'Toggle Outline View', 'bottom', 'dlt-icon-overview', true, false, actionListBar, 'Toggle Outline View');
		this.toggleOutlineViewLink.addEventListener('click', this.toggleOutlineView.bind(this));

		this.deleteLink = this.addActionBarItem('action.bar.delete.text', 'Delete', 'bottom', 'dlt-icon-delete', true, false, actionListBar, 'Delete Java Service');
		this.deleteLink.addEventListener('click', this.deleteJavaService.bind(this));

		this.editLink = this.addActionBarItem('action.bar.edit.actions.text', 'Edit actions', 'bottom', 'dlt-icon-density-large', false, true, actionListBar, 'Java Service Actions');
		this.editLink.addEventListener('click', this.editActions.bind(this));

		this.undoLink = this.addActionBarItem('action.bar.undo.text', 'Undo', 'bottom', 'dlt-icon-undo', false, false, actionListBar, 'Undo');
		this.undoLink.addEventListener('click', this.undo.bind(this));

		this.redoLink = this.addActionBarItem('action.bar.redo.text', 'Redo', 'bottom', 'dlt-icon-redo', true, false, actionListBar, 'Redo');
		this.redoLink.addEventListener('click', this.redo.bind(this));

		this.newJavaServiceLink = this.addActionBarItem('action.bar.new.java.service.text', 'New Java service', 'bottom', 'java-service', false, false, actionListBar, 'New Java Service');
		this.newJavaServiceLink.addEventListener('click', this.newJavaService.bind(this));

		this.saveLink = this.addActionBarItem('action.bar.save.text', 'Save', 'bottom', 'ut-icon-action-bar_save', false, true, actionListBar, 'Save');
		this.saveLink.addEventListener('click', this.saveJavaSuite.bind(this));
		const saveDropDown = this.saveLink.firstElementChild;
		saveDropDown.addEventListener('click', this.saveWithMessage.bind(this));

		this.compileLink = this.addActionBarItem('action.bar.compile.text', 'Compile', 'bottom', 'dlt-icon-utility', false, false, actionListBar, 'Compile');
		this.compileLink.addEventListener('click', this.compileJavaSuite.bind(this));

		this.refreshLink = this.addActionBarItem('action.bar.refresh.text', 'Refresh', 'bottom', 'dlt-icon-refresh', true, false, actionListBar, 'Refresh');
		this.refreshLink.addEventListener('click', this.refreshJavaSuite.bind(this));

		this.helpLink = this.addActionBarItem('action.bar.help.text', 'Help', 'bottom', 'dlt-icon-help', false, true, actionListBar, 'Help');
		this.helpLink.addEventListener('click', this.help.bind(this));

		this.moreLink = this.addActionBarItem('action.bar.more.text', 'More', 'bottom', 'dlt-icon-more-menu', false, false, actionListBar, 'More');
		this.moreLink.addEventListener('click', this.more.bind(this));

		this.addWidget(actionListBar);
	}

	addActionBarItem(tooltipKey: string, tooltipDefault: string, tooltipPosition: string, iconClass: string,
		hasDivider: boolean, isDropdown: boolean, actionListBar: Panel, testTitle: string): HTMLAnchorElement {

		const actionBarItem = document.createElement('li');
		actionBarItem.setAttribute('aria-label', nls.localize(tooltipKey, tooltipDefault));
		actionBarItem.onmouseenter = this.showTooltip.bind(this, actionBarItem, tooltipPosition);
		actionBarItem.classList.add('actionItem');
		if (hasDivider) {
			actionBarItem.classList.add('actions-divider');
		}

		const actionItemLink = document.createElement('a');
		actionItemLink.classList.add(iconClass);
		actionItemLink.classList.add('actionLink');
		if (isDropdown) {
			actionItemLink.classList.add('dropdown');
			const actionItemDropdown = document.createElement('span');
			actionItemDropdown.classList.add('action-item-set');
			actionItemDropdown.classList.add('action-item-set-split');
			actionItemDropdown.classList.add('dlt-icon-caret-down');
			actionItemDropdown.classList.add('js-dropdown');
			actionItemLink.setAttribute('data-cy', 'actionBarCaret' + iconClass);
			actionItemLink.appendChild(actionItemDropdown);
		}

		actionBarItem.appendChild(actionItemLink);
		actionBarItem.setAttribute('data-javaservice-title', testTitle);

		actionListBar.addWidget(new Widget({ node: actionBarItem }));

		return actionItemLink;
	}

	async addEdgeServerDropdown(actionListBar: Panel) {

		const actionBarItem = document.createElement('li');
		actionBarItem.style.lineHeight = '1.5';
		const divItem = document.createElement('div');
		divItem.style.marginLeft = '12px';
		// divItem.classList.add('disabled-edge-servers');
		const selectComponent = React.createElement(SelectComponent, {
			options: (this.edgeServers),
			defaultValue: 0,
			onChange: (_, index) => this.handleUserInteraction(index),
			ref: this.selectComponent
		});

		const root = createRoot(divItem);
		root.render(selectComponent);

		if (divItem.children && divItem.children.length === 1) {
			let child1 = divItem.children[0];
			if (child1.children && child1.children.length === 2) {
				let chevronChild = child1.children[1];
				chevronChild.classList.remove('theia-select-component-chevron');
				chevronChild.classList.remove('codicon');
				chevronChild.classList.remove('codicon-chevron-down');
				chevronChild.classList.add('inline-block');
				chevronChild.classList.add('delite-icon');
				chevronChild.classList.add('dlt-icon-caret-down');
			}
		}
		actionBarItem.appendChild(divItem);
		actionBarItem.setAttribute('data-javaservice-title', 'Select Edge Server');

		actionListBar.addWidget(new Widget({ node: actionBarItem }));
	}

	protected handleUserInteraction(selected: number): void {
		ServiceConfig.agentID = this.edgeServerDetails[selected].agentID;
		ServiceConfig.agentGroup = this.edgeServerDetails[selected].agentGroup;
		ServiceConfig.edgeServerName = this.edgeServerDetails[selected].name;
	}

	protected async getEdgeServers() {

		try {
			const response = {
				results: [
					{
						"agentID": "default",
						"agentGroup": "default",
						"name": "Default (Cloud)",
						"description": "Default cloud execution plane, if no edge servers are configured for a flowservice.",
						"executionPlaneType": "cloud",
						"userID": null,
						"email": null,
						"createdDate": 1683654702000,
						"modifiedDate": 1683654702000,
						"status": 1,
						"enabled": 1,
						"firstName": null,
						"lastName": null
					}
				],
				totalRecords: 1
			};




			// await this.invokeBackendService.getEdgeServers();

			console.log('*************** In getEdgeServers');

			if (response && response[RESULTS]) {
				const edgeServerList: any = response[RESULTS];
				console.log('*************** In getEdgeServers');
				console.log('*************** ' + edgeServerList);

				if (edgeServerList.length > 0) {
					for (const edgeServer of edgeServerList) {
						let label = escapeInvisibleChars(edgeServer.name);
						this.edgeServers.push({
							label, value: edgeServer.name
						});
						this.edgeServerDetails.push({ agentID: edgeServer.agentID, agentGroup: edgeServer.agentID });

						if (edgeServer.agentID === 'default' && edgeServer.agentGroup === 'Default') {
							ServiceConfig.agentID = edgeServer.agentID;
							ServiceConfig.agentGroup = edgeServer.agentGroup;
							ServiceConfig.edgeServerName = edgeServer.name;
						}
					}
				}
			}
		} catch (error) {
			handleError(`${error}`, this.messageService, 'rest.api.retrieve.edge.servers.error.msg', 'Problem retrieving the list of edge servers.\\\n{0}');
		}
	}

	inputOutputSignature() {
		if (this.selectedJSNode && this.selectedJSNode.javaService) {
			ServiceConfig.javaServiceName = this.selectedJSNode.javaService;
			this.commandRegistry.executeCommand(JavaServiceCommands.INPUT_OUTPUT.id, this.selectedJSNode);
		}
	}

	logBusinessData() {
		if (this.selectedJSNode && this.selectedJSNode.javaService) {
			ServiceConfig.javaServiceName = this.selectedJSNode.javaService;
			this.commandRegistry.executeCommand(JavaServiceCommands.LOG_BUSINESS_DATA.id);
		}
	}

	deleteJavaService() {
		if (this.selectedJSNode && this.selectedJSNode.javaService) {
			ServiceConfig.javaServiceName = this.selectedJSNode.javaService;
			this.commandRegistry.executeCommand(JavaServiceCommands.DELETE_JAVA_SERVICE.id);
		}
	}

	editActions(e) {
		const x = e.clientX;
		const y = e.clientY;
		//       this.toDispose.push(Disposable.create(() =>
		if (this.isJavaServiceSelectedInOutlineView || this.isRootSelectedInOutlineView) {
			setTimeout(() => this.contextMenuRenderer.render({
				menuPath: JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_MENU_PATH,
				anchor: { x, y }
			}));
		}
		else {
			setTimeout(() => this.contextMenuRenderer.render({
				menuPath: JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_MENU_PATH,
				anchor: { x, y }
			}));
		}

		// }
	}

	undo() {
		this.commandRegistry.executeCommand(CommonCommands.UNDO.id);
	}

	redo() {
		this.commandRegistry.executeCommand(CommonCommands.REDO.id);
	}

	goBack() {
		// if (history.length - this.initialHistoryLength > 0) {

		this.commandRegistry.executeCommand(JavaServiceCommands.BACK_TO_ORIGIN_PROJECT.id);
	}

	find() {
		this.commandRegistry.executeCommand(CommonCommands.FIND.id);
	}

	toggleMinimap() {
		this.commandRegistry.executeCommand(EditorCommands.TOGGLE_MINIMAP.id);
	}

	toggleOutlineView() {
		this.commandRegistry.executeCommand('outlineView:toggle');
	}

	help(e) {
		const x = e.clientX;
		const y = e.clientY;
		//       this.toDispose.push(Disposable.create(() =>
		setTimeout(() => this.contextMenuRenderer.render({
			menuPath: JavaServiceHelpContextMenu.HELP_MENU_PATH,
			anchor: { x, y }
		}));
	}

	more(e) {
		const x = e.clientX;
		const y = e.clientY;
		//       this.toDispose.push(Disposable.create(() =>
		setTimeout(() => this.contextMenuRenderer.render({
			menuPath: JavaServiceMoreContextMenu.MORE_MENU_PATH,
			anchor: { x, y }
		}));
	}

	newJavaService() {
		ServiceConfig.javaServiceName = undefined;
		this.commandRegistry.executeCommand(JavaServiceCommands.NEW_JAVA_SERVICE.id);
	}

	saveJavaSuite() {
		ServiceConfig.javaServiceName = undefined;
		this.commandRegistry.executeCommand(JavaServiceCommands.JAVA_SUITE_SAVE.id);
	}

	compileJavaSuite() {
		ServiceConfig.javaServiceName = undefined;
		this.commandRegistry.executeCommand(JavaServiceCommands.JAVA_SUITE_COMPILE.id);
	}

	refreshJavaSuite() {
		ServiceConfig.javaServiceName = undefined;
		this.commandRegistry.executeCommand(JavaServiceCommands.JAVA_SUITE_REFRESH.id);
	}

	saveWithMessage(e) {
		const x = e.clientX;
		const y = e.clientY;
		e.preventDefault();
		e.stopPropagation();
		//       this.toDispose.push(Disposable.create(() =>
		setTimeout(() => this.contextMenuRenderer.render({
			menuPath: JavaServiceSaveContextMenu.SAVE_MENU_PATH,
			anchor: { x, y }
		}));
	}

	debugJavaService(e) {
		// if (this.selectedJSNode) {
		// const colIdx = this.selectedJSNode.javaService.indexOf(':');
		// const javaServiceName = this.selectedJSNode.javaService.substring(colIdx + 1);
		// ServiceConfig.javaServiceName = javaServiceName;
		// ServiceConfig.breakpointsEnabled = undefined;
		// this.commandRegistry.executeCommand(JavaServiceCommands.DEBUG_JAVA_SERVICE.id);


		const x = e.clientX;
		const y = e.clientY;
		//       this.toDispose.push(Disposable.create(() =>
		setTimeout(() => this.contextMenuRenderer.render({
			menuPath: JavaServiceDebugContextMenu.JAVA_SERVICE_DEBUG_MENU_PATH,
			anchor: { x, y }
		}));

		// }
	}

	runJavaService() {
		if (this.selectedJSNode) {
			// const colIdx = this.selectedJSNode.javaService.indexOf(':');
			// const javaServiceName = this.selectedJSNode.javaService.substring(colIdx + 1);
			// const breakpointsEnabled = this.breakpointManager.breakpointsEnabled;
			// ServiceConfig.javaServiceName = javaServiceName;
			// ServiceConfig.breakpointsEnabled = breakpointsEnabled;
			this.commandRegistry.executeCommand(JavaServiceCommands.RUN_JAVA_SERVICE.id);
		}
	}

	setSelectedJavaService(node: CompositeTreeNode[], outlineSelection: boolean) {
		this.isJavaServiceSelectedInOutlineView = false;
		this.isRootSelectedInOutlineView = false;
		this.selectedJSNode = null;
		// this.debugLink.classList.add('disabled');
		if (this.runLink && this.ioLink && this.logBDLink && this.deleteLink) {
			this.runLink.classList.add('disabled');
			this.ioLink.classList.add('disabled');
			this.logBDLink.classList.add('disabled');
			this.deleteLink.classList.add('disabled');
		}

		let selJSCount = 0;

		if (node && node.length > 0) {
			let tempSelectedJSNode;
			let isRoot = false;
			for (let j = 0; j < node.length; j++) {
				for (const childNode of node[j].children) {
					if ((childNode as SelectableTreeNode).selected === true) {
						selJSCount++;
						if ((childNode as JavaServiceOutlineSymbolInformationNode).javaService &&
							(childNode as JavaServiceOutlineSymbolInformationNode).selected === true) {
							tempSelectedJSNode = childNode;
						}
						else if (childNode.parent && childNode.parent.id === 'outline-view-root') {
							isRoot = true;
						}
					}
				}
			}
			if (selJSCount === 1 && tempSelectedJSNode) {
				this.selectedJSNode = tempSelectedJSNode;
				// this.debugLink.classList.remove('disabled');
				this.runLink.classList.remove('disabled');
				this.ioLink.classList.remove('disabled');
				this.logBDLink.classList.remove('disabled');
				if (!ServiceConfig.isReadOnly === true) {
					this.deleteLink.classList.remove('disabled');
				}

				this.isJavaServiceSelectedInOutlineView = outlineSelection;
			}
			else if (selJSCount === 1 && isRoot) {
				this.isRootSelectedInOutlineView = true;
			}
		}
	}

	public set editorEnablement(isEditorEnabled: boolean) {
		this.isEditorEnabled = isEditorEnabled;
	}

	setEditorCommandsEnablement() {
		const undoHandler = this.commandRegistry.getActiveHandler(CommonCommands.UNDO.id);
		const redoHandler = this.commandRegistry.getActiveHandler(CommonCommands.REDO.id);
		if (undoHandler && undoHandler.isEnabled() === true && ServiceConfig.isReadOnly !== true) {
			this.undoLink.classList.remove('disabled');
		}
		else {
			this.undoLink.classList.add('disabled');
		}
		if (redoHandler && redoHandler.isEnabled() === true && ServiceConfig.isReadOnly !== true) {
			this.redoLink.classList.remove('disabled');
		}
		else {
			this.redoLink.classList.add('disabled');
		}
		if (this.isEditorEnabled === true) {
			this.saveLink.classList.remove('disabled');
			this.compileLink.classList.add('disabled');
		}
		else {
			this.saveLink.classList.add('disabled');
			this.compileLink.classList.remove('disabled');
		}

		if (ServiceConfig.isReadOnly === true) {
			this.saveLink.classList.add('disabled');
			this.compileLink.classList.add('disabled');
			this.newJavaServiceLink.classList.add('disabled');
		}
		else {
			this.newJavaServiceLink.classList.remove('disabled');
		}
	}

	showTooltip(tooltipTarget: HTMLElement, tooltipPosition: any) {
		const tooltipContent = tooltipTarget.getAttribute('aria-label');
		this.hoverService.requestHover({
			content: tooltipContent,
			target: tooltipTarget,
			position: tooltipPosition
		});
		// }
	};

	dirtyChanged(isDirty: boolean) {
		const titleH2 = document.getElementById('JavaSuiteTitle');
		if (titleH2) {
			if (isDirty) {
				titleH2.textContent = DIRTY_INDICATOR + ServiceConfig.javaSuiteTitle;
			}
			else {
				titleH2.textContent = ServiceConfig.javaSuiteTitle;
			}
		}
	}

	protected async handleGetJavaServiceInfo() {
		try {
			const javaServiceInfo =
				new JavaServiceInfo("Default", "Proj4", "11111",
					"Default", "EdgeProj4", "JS1", "edge.proj4.javaservices",
					"http://localhost:4200", false, "11111", "11111");

			// await this.invokeBackendService.getJavaServiceInfo();
			// console.log('************** In handleGetJavaServiceInfo response');

			if (javaServiceInfo) {
				ServiceConfig.loadJavaServiceFromInfo(javaServiceInfo);
				ServiceConfig.javaSuiteTitle = nls.localize('java.suite.title', '{0}: Java services', ServiceConfig.projectName);
			}
		}
		catch (error) {
			handleError(`${error}`, this.messageService, 'retrieve.java.service.info.error.msg', 'Problem retrieving the Java service information.\\\n{0}');
		}
	}

	dispose(): void {
		this.toDispose.dispose();
	}
}
