import { MaybePromise } from '@theia/core';
import { DialogProps, DialogMode, DialogError } from '@theia/core/lib/browser/dialogs';
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class JavaServiceDialogProps extends DialogProps {
	readonly confirmButtonLabel?: string;
	readonly initialValue?: string;
	readonly initialSelectionRange?: {
		start: number
		end: number
		direction?: 'forward' | 'backward' | 'none'
	};
	readonly validate?: (input: string, mode: DialogMode) => MaybePromise<DialogError>;
}