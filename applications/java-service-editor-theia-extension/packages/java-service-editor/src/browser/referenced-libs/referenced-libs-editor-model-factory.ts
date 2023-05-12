import { inject, injectable } from '@theia/core/shared/inversify';
import { Resource } from '@theia/core/lib/common/resource';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { MonacoEditorModelFactory } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { MonacoToProtocolConverter } from '@theia/monaco/lib/browser/monaco-to-protocol-converter';
import { ProtocolToMonacoConverter } from '@theia/monaco/lib/browser/protocol-to-monaco-converter';
import { REFERENCED_LIBS_SCHEME } from './referenced-libs-constants';

@injectable()
export class ReferencedLibsEditorModelFactory implements MonacoEditorModelFactory {

    @inject(MonacoToProtocolConverter)
    protected readonly m2p: MonacoToProtocolConverter;

    @inject(ProtocolToMonacoConverter)
    protected readonly p2m: ProtocolToMonacoConverter;

    readonly scheme: string = REFERENCED_LIBS_SCHEME;

    createModel(
        resource: Resource
    ): MonacoEditorModel {
        return new ReferencedLibsEditorModel(resource, this.m2p, this.p2m);
    }

}

export class ReferencedLibsEditorModel extends MonacoEditorModel {

    override get readOnly(): boolean {
        return true;
    }

    protected override setDirty(dirty: boolean): void {
        // NOOP
    }

}
