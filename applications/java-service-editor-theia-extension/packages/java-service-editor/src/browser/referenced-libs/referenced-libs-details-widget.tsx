import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { Widget, BaseWidget, Message, MessageLoop } from '@theia/core/lib/browser';
import { TheiaDockPanel } from '@theia/core/lib/browser/shell/theia-dock-panel';
import { EditorWidget } from '@theia/editor/lib/browser';
import { Disposable } from '@theia/core/lib/common/disposable';
import { SelectionService } from '@theia/core/lib/common/selection-service';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MonacoTextModelService } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { toArray } from '@theia/core/shared/@phosphor/algorithm';
import { URI } from '@theia/core/lib/common/uri';
import { ReferencedLibsEditorFactory } from './referenced-libs-editor-factory';
import { ReferencedLibsEditorProvider } from './referenced-libs-editor-provider';


export const REFERENCED_LIBS_DETAILS_ID = 'referenced-libs-details';

const CLASS = 'referenced-libs-details';

const DOCK_PANEL_CLASS = 'referenced-libs-detail-dock-panel';

@injectable()
export class ReferencedLibsDetailsWidget extends BaseWidget {

    @inject(ReferencedLibsEditorProvider)
    protected readonly editorProvider: ReferencedLibsEditorProvider;

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(ReferencedLibsEditorFactory)
    protected readonly editorFactory: ReferencedLibsEditorFactory;

    @inject(MonacoTextModelService)
    protected readonly textModelService: MonacoTextModelService;

    protected readonly editorContainer: TheiaDockPanel;

    _detailUri: URI;

    _editorWidget: EditorWidget;

    constructor() {
        super();

        this.id = REFERENCED_LIBS_DETAILS_ID;
        this.addClass(CLASS);

        this.editorContainer = new NoopDragOverDockPanel({ spacing: 0, mode: 'single-document' });
        this.editorContainer.addClass(DOCK_PANEL_CLASS);
        this.editorContainer.node.tabIndex = -1;
    }

    @postConstruct()
    protected init(): void {
        this.refreshEditorWidget();
    }

    protected async refreshEditorWidget({ preserveFocus }: { preserveFocus: boolean } = { preserveFocus: false }): Promise<void> {
        const editorWidget = this.editorWidget;
        if (editorWidget) {
            this.editorContainer.layout.removeWidget(editorWidget);
        }
        if (this.detailUri) {
            this.editorWidget = await this.createEditorWidget();
            if (this.editorWidget) {
                this.editorContainer.addWidget(this.editorWidget);
                this.activate();
            }
        }
    }

    protected override onAfterAttach(message: Message): void {
        super.onAfterAttach(message);
        Widget.attach(this.editorContainer, this.node);
        this.toDisposeOnDetach.push(Disposable.create(() => Widget.detach(this.editorContainer)));
    }

    protected override onActivateRequest(message: Message): void {
        super.onActivateRequest(message);
        if (this.editor) {
            this.editor.focus();
        } else {
            this.node.focus();
        }
    }

    protected override onResize(message: Widget.ResizeMessage): void {
        super.onResize(message);
        MessageLoop.sendMessage(this.editorContainer, Widget.ResizeMessage.UnknownSize);
        for (const widget of toArray(this.editorContainer.widgets())) {
            MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
        }
    }

    protected override onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.onResize(Widget.ResizeMessage.UnknownSize); // Triggers an editor widget resize. (#8361)
    }

    private async createEditorWidget(): Promise<EditorWidget | undefined> {
        const editor = await this.editorProvider.get(this.detailUri);
        return new EditorWidget(editor, this.selectionService);
    }

    private get editorWidget(): EditorWidget | undefined {
        return this._editorWidget;
    }

    private set editorWidget(editorWidget: EditorWidget) {
        this._editorWidget = editorWidget;
    }

    private get editor(): MonacoEditor | undefined {
        const widget = this.editorWidget;
        if (widget instanceof EditorWidget) {
            if (widget.editor instanceof MonacoEditor) {
                return widget.editor;
            }
        }
        return undefined;
    }

    getText(): string | undefined {
        return this.editor?.getControl().getModel()?.getValue();
    }

    get detailUri(): URI {
        return this._detailUri;
    }

    set detailUri(detailUri: URI) {
        this._detailUri = detailUri;
        this.refreshEditorWidget();
    }
}

/**
 * Customized `DockPanel` that does not allow dropping widgets into it.
 */
class NoopDragOverDockPanel extends TheiaDockPanel { }
NoopDragOverDockPanel.prototype['_evtDragOver'] = () => { };
NoopDragOverDockPanel.prototype['_evtDrop'] = () => { };
NoopDragOverDockPanel.prototype['_evtDragLeave'] = () => { };
