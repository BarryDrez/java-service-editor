import URI from '@theia/core/lib/common/uri';
import { EditorPreferences } from '@theia/editor/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MonacoCommandServiceFactory } from '@theia/monaco/lib/browser/monaco-command-service';
import { MonacoContextMenuService } from '@theia/monaco/lib/browser/monaco-context-menu';
import { MonacoDiffNavigatorFactory } from '@theia/monaco/lib/browser/monaco-diff-navigator-factory';
import { EditorServiceOverrides, MonacoEditor, MonacoEditorServices } from '@theia/monaco/lib/browser/monaco-editor';
import { MonacoEditorService } from '@theia/monaco/lib/browser/monaco-editor-service';
import { MonacoTextModelService } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { MonacoWorkspace } from '@theia/monaco/lib/browser/monaco-workspace';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import { MonacoToProtocolConverter } from '@theia/monaco/lib/browser/monaco-to-protocol-converter';
import { ProtocolToMonacoConverter } from '@theia/monaco/lib/browser/protocol-to-monaco-converter';
import { ContextKeyService } from '@theia/monaco-editor-core/esm/vs/platform/contextkey/browser/contextKeyService';
import { DisposableCollection } from '@theia/core/lib/common';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { ReferencedLibsEditorFactory } from './referenced-libs-editor-factory';

@injectable()
export class ReferencedLibsEditorProvider extends MonacoEditorProvider {

    @inject(ReferencedLibsEditorFactory)
    protected readonly factory: ReferencedLibsEditorFactory;

    @inject(MonacoEditorServices)
    protected readonly services: MonacoEditorServices;

    protected _current: MonacoEditor | undefined;
    /**
     * Returns the last focused MonacoEditor.
     * It takes into account inline editors as well.
     * If you are interested only in standalone editors then use `MonacoEditor.getCurrent(EditorManager)`
     */
    get current(): MonacoEditor | undefined {
        return this._current;
    }

    constructor(
        @inject(MonacoEditorService) protected readonly codeEditorService: MonacoEditorService,
        @inject(MonacoTextModelService) protected readonly textModelService: MonacoTextModelService,
        @inject(MonacoContextMenuService) protected readonly contextMenuService: MonacoContextMenuService,
        @inject(MonacoToProtocolConverter) protected readonly m2p: MonacoToProtocolConverter,
        @inject(ProtocolToMonacoConverter) protected readonly p2m: ProtocolToMonacoConverter,
        @inject(MonacoWorkspace) protected readonly workspace: MonacoWorkspace,
        @inject(MonacoCommandServiceFactory) protected readonly commandServiceFactory: MonacoCommandServiceFactory,
        @inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
        @inject(MonacoDiffNavigatorFactory) protected readonly diffNavigatorFactory: MonacoDiffNavigatorFactory,
        /** @deprecated since 1.6.0 */
        @inject(ApplicationServer) protected readonly applicationServer: ApplicationServer,
        @inject(ContextKeyService) protected readonly contextKeyService: ContextKeyService
    ) {
        super(codeEditorService, textModelService, contextMenuService, m2p, p2m,
            workspace, commandServiceFactory, editorPreferences, diffNavigatorFactory,
            applicationServer, contextKeyService);
    }

    async get(uri: URI): Promise<MonacoEditor> {
        await this.editorPreferences.ready;
        return this.doCreateEditor(uri, (override, toDispose) => this.createEditor(uri, override, toDispose));
    }

    protected createEditor(uri: URI, override: EditorServiceOverrides, toDispose: DisposableCollection): Promise<MonacoEditor> {
        return this.createMonacoEditor(uri, override, toDispose);
    }

    protected async createMonacoEditor(uri: URI, override: EditorServiceOverrides, toDispose: DisposableCollection): Promise<MonacoEditor> {
        const model = await this.getModel(uri, toDispose);
        const options = this.createMonacoEditorOptions(model);
        const editor = this.factory
            ? this.factory.create(model, options, override)
            : new MonacoEditor(uri, model, document.createElement('div'), this.services, options, override);
        toDispose.push(this.editorPreferences.onPreferenceChanged(event => {
            if (event.affects(uri.toString(), model.languageId)) {
                this.updateMonacoEditorOptions(editor, event);
            }
        }));
        toDispose.push(editor.onLanguageChanged(() => this.updateMonacoEditorOptions(editor)));
        editor.document.onWillSaveModel(event => event.waitUntil(this.formatOnSave(editor, event)));
        return editor;
    }
}
