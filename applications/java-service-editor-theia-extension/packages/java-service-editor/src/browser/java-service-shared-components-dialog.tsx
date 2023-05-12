import * as React from 'react';
import { Suspense } from 'react';
import { Message } from '@phosphor/messaging';
import { DisposableCollection } from '@theia/core';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { postConstruct, inject } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core';
import { deepClone, CommandRegistry } from '@theia/core/lib/common';
import { JavaServiceDialogProps } from './java-service-dialog-props';
import { JavaServiceCommands } from './java-service-commands';
import { ServiceConfig } from '../common/java-service-config';
import { ErrorBoundary } from './utils/error-boundary';

const SERVICE_TYPE = 'java';
const COLON = ':';

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

export class SharedComponentsDialog extends ReactDialog<any | undefined> {

    toDispose = new DisposableCollection();

    shouldSave = true;
    javaService: string;

    signatureDetail: any;
    originalSignatureDetail: any;
    newSignatureDetail: any;
    newGitMessage: string;

    // svcInValidator = 'none';
    // svcOutValidator = 'none';
    // svcValidator = { svcInValidator: this.svcInValidator, svcOutValidator: this.svcOutValidator };
    viewMode = false;

    sharedComponentsElement: any;

    sharedCompAction = -1;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    @postConstruct()
    protected async init(): Promise<void> {
        this.update();
    }

    constructor(javaServiceName: string, signatureDetail: any, sharedCompAction: number, isReadOnly: boolean,
        private commandRegistry: CommandRegistry) {

        super(new JavaServiceDialogProps());

        if (isReadOnly === true) {
            this.viewMode = true;
        }
        this.id = 'shared-components-dialog-shell';
        this.javaService = javaServiceName;
        this.signatureDetail = signatureDetail;
        this.sharedCompAction = sharedCompAction;
    }

    protected render(): React.ReactNode {

        let svcValidator;
        let signatureStr;
        let svcValidatorStr;

        if (this.signatureDetail) {
            svcValidator = {
                svcInValidator: this.signatureDetail.svc_in_validator_options,
                svcOutValidator: this.signatureDetail.svc_out_validator_options
            };

            this.originalSignatureDetail = { ...deepClone(this.signatureDetail) };
            signatureStr = JSON.stringify(this.signatureDetail.svc_sig);
            svcValidatorStr = JSON.stringify(svcValidator);
        }

        return (<div id='widget-container' className='service-editor-content ut'>
            <Suspense fallback={<div></div>}>
                <ErrorBoundary>
                    <UTLazyReferenceComponent></UTLazyReferenceComponent>
                    <shared-components ref={elem => this.addEventListeners(elem)} id="shared-components"
                        sharedcompaction={this.sharedCompAction}
                        viewmode={this.viewMode}
                        projectname={ServiceConfig.projectId}
                        servicename={this.javaService}
                        servicensname={ServiceConfig.folderNS + COLON + this.javaService}
                        packagename={ServiceConfig.packageName}
                        servicetype={SERVICE_TYPE}
                        servicesignature={signatureStr}
                        servicevalidator={svcValidatorStr}
                        javaeditor={true}
                        agentid={ServiceConfig.agentID}
                        agentgroup={ServiceConfig.agentGroup}
                        edgeservername={ServiceConfig.edgeServerName}
                        csrftoken={ServiceConfig.csrfToken}
                        authtoken={ServiceConfig.authToken}
                        gitcommitmessage={ServiceConfig.serviceCommitMessage}
                        author={ServiceConfig.serviceNameAuthor}
                        iosave={"this.saveSignature($event)"}
                        ioclose={"this.closeSignature()"}
                        provclose={"this.closeSC()"}
                        lbdclose={"this.closeSC()"}
                        schedclose={"this.closeSC()"}
                        ehclose={"this.closeSC()"}
                        vhclose={"this.closeSC()"}
                        swmclose={"this.closeSC()"}
                        swmsave={"this.saveWithMessage($event)"}
                        displayexecutions={"this.displayExecutions()"}
                        hideexecutions={"this.closeSC()"} />
                </ErrorBoundary>
            </Suspense>
        </div >);
    }

    addEventListeners(elem) {
        this.sharedComponentsElement = elem
        this.sharedComponentsElement.addEventListener("ioclose", this.closeSignature);
        this.sharedComponentsElement.addEventListener("iosave", this.saveSignature);
        this.sharedComponentsElement.addEventListener("provclose", this.closeSC);
        this.sharedComponentsElement.addEventListener("lbdclose", this.closeSC);
        this.sharedComponentsElement.addEventListener("schedclose", this.closeSC);
        this.sharedComponentsElement.addEventListener("ehclose", this.closeSC);
        this.sharedComponentsElement.addEventListener("vhclose", this.closeSC);
        this.sharedComponentsElement.addEventListener("swmsave", this.saveWithMessage);
        this.sharedComponentsElement.addEventListener("swmclose", this.closeSC);
        this.sharedComponentsElement.addEventListener("displayexecutions", this.displayExecutions);
        this.sharedComponentsElement.addEventListener("hideexecutions", this.closeSC);
        this.newSignatureDetail = undefined;
        this.newGitMessage = undefined;
    }

    protected closeSignature = (): void => {
        this.signatureDetail = this.originalSignatureDetail;
        this.accept();
    };

    protected closeSC = (): void => {
        this.accept();
    };

    protected saveSignature = (event: any): void => {

        if (event && event.detail) {
            this.signatureDetail = event.detail;
            this.newSignatureDetail = this.signatureDetail;
            this.validate();
            this.accept();
        }
    };

    protected saveWithMessage = (event: any): void => {

        if (event && event.detail) {
            this.newGitMessage = event.detail;
            this.validate();
            this.accept();
        }
    };

    protected displayExecutions = (): void => {
        setTimeout(() => {
            this.commandRegistry.executeCommand(JavaServiceCommands.SHOW_LAST_INVOCATION_VIEW.id);
        });
        this.accept();
    }

    get value(): any | undefined {
        if (this.newSignatureDetail) {
            return this.newSignatureDetail;
        }
        else if (this.newGitMessage) {
            return this.newGitMessage;
        }
        return undefined;
    }

    protected async accept(): Promise<void> {
        this.removeEventListeners();
        return super.accept();
    }

    removeEventListeners() {
        this.sharedComponentsElement.removeEventListener("ioclose", this.closeSignature);
        this.sharedComponentsElement.removeEventListener("iosave", this.saveSignature);
        this.sharedComponentsElement.removeEventListener("provclose", this.closeSC);
        this.sharedComponentsElement.removeEventListener("lbdclose", this.closeSC);
        this.sharedComponentsElement.removeEventListener("schedclose", this.closeSC);
        this.sharedComponentsElement.removeEventListener("ehclose", this.closeSC);
        this.sharedComponentsElement.removeEventListener("vhclose", this.closeSC);
        this.sharedComponentsElement.removeEventListener("displayexecutions", this.displayExecutions);
        this.sharedComponentsElement.removeEventListener("hideexecutions", this.closeSC);
    }

    override dispose(): void {
        this.removeEventListeners();
        this.toDispose.dispose();
        super.dispose();
    }
}
