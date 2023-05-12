import { inject, injectable } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { MonacoEditorFactory } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { EditorServiceOverrides, MonacoEditor, MonacoEditorServices } from '@theia/monaco/lib/browser/monaco-editor';
import { IContextMenuService } from '@theia/monaco-editor-core/esm/vs/platform/contextview/browser/contextView';
import { REFERENCED_LIBS_SCHEME } from './referenced-libs-constants';

@injectable()
export class ReferencedLibsEditorFactory implements MonacoEditorFactory {

    @inject(MonacoEditorServices)
    protected readonly services: MonacoEditorServices;

    readonly scheme: string = REFERENCED_LIBS_SCHEME;

    create(model: MonacoEditorModel, defaultsOptions: MonacoEditor.IOptions, defaultOverrides: EditorServiceOverrides): MonacoEditor {
        const uri = new URI(model.uri);
        const options = this.createOptions(model, defaultsOptions);
        const overrides = this.createOverrides(model, defaultOverrides);
        return new MonacoEditor(uri, model, document.createElement('div'), this.services, options, overrides);
    }

    protected createOptions(model: MonacoEditorModel, defaultOptions: MonacoEditor.IOptions): MonacoEditor.IOptions {
        return {
            ...defaultOptions,
            overviewRulerLanes: 3,
            lineNumbersMinChars: 3,
            fixedOverflowWidgets: true,
            wordWrap: 'off',
            lineNumbers: 'off',
            glyphMargin: false,
            lineDecorationsWidth: 0,
            rulers: [],
            folding: false,
            scrollBeyondLastLine: false,
            readOnly: true,
            renderLineHighlight: 'none',
            minimap: { enabled: false },
            matchBrackets: 'never'
        };
    }

    protected *createOverrides(model: MonacoEditorModel, defaultOverrides: EditorServiceOverrides): EditorServiceOverrides {
        for (const [identifier, provider] of defaultOverrides) {
            if (identifier !== IContextMenuService) {
                yield [identifier, provider];
            }
        }
    }

}
