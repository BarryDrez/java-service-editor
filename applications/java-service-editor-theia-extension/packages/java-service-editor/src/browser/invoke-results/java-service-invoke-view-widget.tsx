import * as React from 'react';
import { Suspense } from 'react';
import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { nls } from '@theia/core/lib/common/nls';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { MessageService, DisposableCollection } from '@theia/core';
import { ServiceConfig } from '../../common/java-service-config';
import { codicon } from '@theia/core/lib/browser';

const UTLazyReferenceComponent = React.lazy(() => {
	let utFiles = Promise.resolve()
		.then(() => import('@builtioflow/origin-shared-components/runtime.js'))
		.then(() => import('@builtioflow/origin-shared-components/polyfills.js'))
		.then(() => import('@builtioflow/origin-shared-components/scripts.js'))
		.then(() => import('@builtioflow/origin-shared-components/main.js'))
		.then(() => import('@builtioflow/origin-shared-components/styles.css'));
	return utFiles.then(() => {
		return {
			default: () => <></>
		}
	});
});

@injectable()
export class JavaServiceInvokeViewWidget extends ReactWidget {

	static readonly ID = 'jse-invocation-view';
	static readonly LABEL = nls.localize('invoke.view.title', 'Service results');

	toDispose = new DisposableCollection();

	invokeWidgetElement: any;

	_invokeResults: any;

	@inject(MessageService)
	protected readonly messageService!: MessageService;

	@postConstruct()
	protected init(): void {

		this.id = JavaServiceInvokeViewWidget.ID;
		this.title.label = JavaServiceInvokeViewWidget.LABEL;
		this.title.caption = JavaServiceInvokeViewWidget.LABEL;
		this.title.closable = true;
		this.title.iconClass = codicon('run');
		this.update();
	}

	protected render(): React.ReactNode {

		if (ServiceConfig.javaServiceName) {
			return (<div id='widget-container' className='service-editor-content ut'>
				<Suspense fallback={<div></div>}>
					<UTLazyReferenceComponent></UTLazyReferenceComponent>
					<shared-components-service-test ref={elem => {
						this.invokeWidgetElement = elem;
						this.invokeWidgetElement.addEventListener("jsonsource", this.jsonSource);
					}}
						id='java-service-invoke-view-widget'
						jsonsource={"this.jsonSource($event)"}
						showtoolbar={false}></shared-components-service-test>
				</Suspense>
			</div>)
		}
		else {
			return undefined;
		}
	}

	protected jsonSource = (event: any): void => {

		if (event && event.detail) {
			this._invokeResults = event.detail;
		}
	};

	public get invokeResults(): any {
		return this._invokeResults;
	}

	override dispose(): void {
		this.invokeWidgetElement.removeEventListener("jsonsource", this.jsonSource);
		this.toDispose.dispose();
		super.dispose();
	}
}
