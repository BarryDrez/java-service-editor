import { InvokeBackendService } from '../common/protocol';
import { injectable, inject } from '@theia/core/shared/inversify';
import { readdir } from '@theia/core/shared/fs-extra';
import { FileUri } from '@theia/core/lib/node/file-uri';
import { normalize } from 'path';
import URI from '@theia/core/lib/common/uri';
import * as path from 'path';
import fetch, { RequestInit, Response, Body } from 'node-fetch';
import { Agent } from 'https'
import * as fs from '@theia/core/shared/fs-extra';

import { Disposable, ILogger, Logger } from '@theia/core';
import { EncodingService } from '@theia/core/lib/common/encoding-service';

import { ServiceConfig } from '../common/java-service-config';
import { JavaServiceInfo } from '../common/java-service-info';
import { CTPInfo } from './ctp-info';
import { ScaffoldingInput } from './scaffolding-input';

const Unauthorized = 401;
const Forbidden = 403;

const httpsAgent: any = new Agent({
    keepAlive: true,
    rejectUnauthorized: false,
});

const ctpHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'authtoken': '',
    'x-csrf-token': '',
    'Cookie': ''
};

const ctpBodyHeaders = {
    "X-wM-AdminUI": true,
    "Accept": "application/octet-stream"
}

const ctpBody = {
    'apiEndPoint': '',
    'agentID': 'default',
    'agentGroup': 'Default',
    'httpMethod': 'GET',
    'headers': ctpBodyHeaders,
    'input': {}
};

const ctpUrl = '/integration/rest/origin/flow/admin-proxy/';

@injectable()
export class InvokeBackendServiceImpl implements InvokeBackendService {
    @inject(ILogger)
    private readonly logger: ILogger;
    @inject(EncodingService)
    protected readonly encodingService: EncodingService;

    getJavaServiceInfo(): Promise<any> {
        return new Promise((resolve) => {
            const javaServiceInfo =
                new JavaServiceInfo(ServiceConfig.javaSuiteName, ServiceConfig.projectName, ServiceConfig.projectId,
                    ServiceConfig.groupName, ServiceConfig.packageName, ServiceConfig.javaServiceName, ServiceConfig.folderNS,
                    ServiceConfig.originServer, ServiceConfig.isReadOnly, ServiceConfig.csrfToken, ServiceConfig.authToken);
            resolve(javaServiceInfo);
        });
    }

    async getReferencedLibrariesJars(libDir: any): Promise<any> {

        this.logger.info(
            `entered InvokeBackendServiceImpl getPackageJars 
            libDir: ${libDir}
            `
        );
        return (readdir)(this.toFilePath(libDir));
    }

    async updateClasspath(wsPath: string, libPath: string, remove: boolean): Promise<any> {

        const settingsPath = wsPath + path.sep + '.theia' + path.sep + 'settings.json';
        const jarsLoc = libPath + '/**/*.jar';
        let settingsChanged = false;

        this.logger.info(
            `entered InvokeBackendServiceImpl updateClasspath 
            jarsLoc: ${jarsLoc}   settingsPath: ${settingsPath}
            `
        );

        const settingsJson = await fs.readJSON(settingsPath);

        let libs: string[] = [];
        if (settingsJson && settingsJson['java.project.referencedLibraries']) {
            libs = settingsJson['java.project.referencedLibraries'];
            let jarsPos = libs.indexOf(jarsLoc);
            if (jarsPos > -1) {
                if (remove) {
                    libs.splice(jarsPos, 1);
                    settingsChanged = true;
                }
            }
            else {
                if (!remove) {
                    libs.push(jarsLoc);
                    settingsChanged = true;
                }
            }
        }
        else {
            if (!remove) {
                libs = [jarsLoc];
                settingsChanged = true;
            }
        }

        if (settingsChanged) {
            settingsJson['java.project.referencedLibraries'] = libs;
            let settingsStr = JSON.stringify(settingsJson, null, 4);
            fs.writeFile(settingsPath, settingsStr);
        }

        return { update: true };
    }

    protected toFilePath(resource: URI): string {
        return normalize(FileUri.fsPath(resource));
    }

    async isSessionActive(): Promise<any> {

        const url = '/integration/isSessionActive';

        try {
            this.logger.info(
                `entered InvokeBackendServiceImpl isSessionActive 
                CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                `
            );

            this.setCTPInfo();
            const response = await fetch(CTPInfo.location + url, {
                method: 'GET',
                headers: ctpHeaders,
                agent: httpsAgent
            });
            if (response.ok) {
                const json = await response.json();
                this.logger.info(`${url} passed.`);
                return json;
            }
            else {
                try {
                    const errResp = this.handleError(url, response);
                    return Promise.resolve(errResp);
                }
                catch (err) {
                    throw err;
                }
            }
        }
        catch (error) {
            this.reportError('isSessionActive', url, error);
            throw error;
        }
    }

    async getEdgeServers(): Promise<any> {

        const url = '/integration/rest/origin/agent/list';

        try {
            this.logger.info(
                `entered InvokeBackendServiceImpl getEdgeServers 
                CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                `
            );

            this.setCTPInfo();
            const response = await fetch(CTPInfo.location + url, {
                method: 'GET',
                headers: ctpHeaders,
                agent: httpsAgent
            });
            if (response.ok) {
                const json = await response.json();
                this.logger.info(`${url} passed.`);
                return json;
            }
            else {
                try {
                    const errResp = this.handleError(url, response);
                    return Promise.resolve(errResp);
                }
                catch (err) {
                    throw err;
                }
                // this.logger.error(`/integration/rest/origin/agent/list failed. ${result.statusText}`);
                // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
            }
        }
        catch (error) {
            this.reportError('getEdgeServers', url, error);
            throw error;
        }
    }

    async checkEdgeServer() {

        const url = '/integration/rest/origin/agent/' + ServiceConfig.agentGroup + '/' + ServiceConfig.agentID + '/isReachable?ttl=3000';

        try {
            this.logger.info(
                `entered InvokeBackendServiceImpl checkEdgeServer 
                CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                `
            );

            this.setCTPInfo();
            const response = await fetch(CTPInfo.location + url, {
                method: 'GET',
                headers: ctpHeaders,
                agent: httpsAgent
            });
            if (response.ok) {
                const json = await response.json();
                this.logger.info(`${url} passed.`);
                return json;
            }
            else {
                try {
                    const errResp = this.handleError(url, response);
                    return Promise.resolve(errResp);
                }
                catch (err) {
                    throw err;
                }
                // this.logger.error(`${url} failed. ${result.statusText}`);
                // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
            }
        }
        catch (error) {
            this.reportError('checkEdgeServer', url, error);
            throw error;
        }
    }

    async getUserInfo() {

        const url = '/integration/rest/ut-flow/user/info';

        try {
            this.logger.info(
                `entered InvokeBackendServiceImpl getUserInfo 
                CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                `
            );

            this.setCTPInfo();
            const response = await fetch(CTPInfo.location + url, {
                method: 'GET',
                headers: ctpHeaders,
                agent: httpsAgent
            });
            if (response.ok) {
                const json = await response.json();
                this.logger.info(`${url} passed.`);
                return json;
            }
            else {
                try {
                    const errResp = this.handleError(url, response);
                    return Promise.resolve(errResp);
                }
                catch (err) {
                    throw err;
                }
                // this.logger.error(`/integration/rest/ut-flow/user/info failed. ${result.statusText}`);
                // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
            }
        }
        catch (error) {
            this.reportError('getUserInfo', ctpBody.apiEndPoint, error);
            throw error;
        }
    }

    setCTPInfo() {
        ctpHeaders.authtoken = CTPInfo.authToken;
        ctpHeaders["x-csrf-token"] = CTPInfo.csrfToken;
        ctpHeaders.Cookie = CTPInfo.cookie;
    }

    async removeAllJarFilesInWorkspaceProject(libDir: string): Promise<any> {

        this.logger.info(
            `entered InvokeBackendServiceImpl removeAllJarFilesInWorkspaceProject 
            ${libDir}
            `
        );

        fs.readdir(libDir, (err, files) => {
            if (err) {
                this.reportError('removeAllJarFilesInWorkspaceProject', 'no endpoint', err);
                throw err;
            }
            for (const file of files) {
                this.logger.info(`-------------------------------- Removing file: ${libDir} ${file}`);
                fs.unlink(path.join(libDir, file), (err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
        return { jarsRemoved: true };
    }

    async isClassInWorkspace(classUri: string): Promise<any> {
        return fs.existsSync(classUri);
    }

    async getJarFilesInPackage(packageName: string, libDir: string, removeExisting: boolean): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'package/' + packageName + '/jar';

            try {
                this.logger.info(
                    `entered InvokeBackendServiceImpl getJarFilesInPackage 
                    ${CTPInfo.location} ${packageName} libDir= ${libDir}
                    `
                );

                if (!fs.existsSync(libDir)) {
                    fs.mkdirSync(libDir, { recursive: true });
                }

                if (removeExisting) {
                    await this.removeAllJarFilesInWorkspaceProject(libDir);
                }
                this.setCTPInfo();
                ctpBody.httpMethod = 'GET';
                ctpBody.input = {};

                this.logger.info(
                    `============================== URL =  
                    ${CTPInfo.location + ctpUrl}
                    `
                );

                const response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(
                        `Response: 
                        ${JSON.stringify(json)}
                        `
                    );

                    if (json && json.jars && json.jars.length > 0) {
                        for (let jar of json.jars) {
                            await this.downloadJarFileInPackage(libDir, packageName, jar.name);
                        }
                    }
                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                }
            }
            catch (error) {
                this.reportError('getJarFilesInPackage', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async downloadJarFileInPackage(libDir: string, packageName: string, jarFile: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'package/' + packageName + '/jar/' + jarFile;

            try {
                this.logger.info(
                    `entered InvokeBackendServiceImpl downloadJarFileInPackage 
                    ${CTPInfo.location} ${packageName} Jar file: ${jarFile}
                    `
                );

                this.setCTPInfo();
                ctpBody.httpMethod = 'GET';
                ctpBody.input = {};

                this.logger.info(
                    `============================== URL =  
                    ${CTPInfo.location + ctpUrl}
                    `
                );
                ctpBody['headers'] = {
                    "X-wM-AdminUI": true,
                    "Accept": "application/octet-stream"
                };

                const response: Response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                ctpBody['headers'] = ctpBodyHeaders;
                const jarPath = libDir + path.sep + jarFile;
                const fileWriteStream = fs.createWriteStream(jarPath);
                response.body.pipe(fileWriteStream);

                return { download: true };
            }
            catch (error) {
                ctpBody['headers'] = ctpBodyHeaders;
                this.reportError('downloadJarFileInPackage', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    debugService(javaService: string, agentID: string, agentGroup: string) {
        console.log('************** Inside getISData (backend)');
        this.logger.info(
            `entered InvokeBackendServiceImpl debugService:
            ${CTPInfo.location} ${javaService}`
        );
        this.logger.info(
            `invoking ** ${CTPInfo.location}/invoke/pub.flow/invokeService`
        );

        console.log('************** Invoking ${CTPInfo.location}/invoke/pub.flow/invokeService (backend)');
        let response: any;
        try {
            response = fetch(CTPInfo.location + '/invoke/pub.flow/invokeService', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                },
                agent: httpsAgent
                // input: {
                //     "body": JSON.stringify({ ifcname: folder, svcname: javaService })
                // }
            }).then(res => res.text());
        }
        catch (error) {
            this.reportError('debugService', CTPInfo.location + '/invoke/pub.flow/invokeService', error);
            throw error;
        }
        return response;
    }

    async saveOrCompileJavaClass(projectName: string, content: any, action: string, gitCommitMsg: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'javaservice/' + projectName + '?action=' + action;

            this.logger.info(
                `entered InvokeBackendServiceImpl saveOrCompileJavaClass:
                ${ctpBody.apiEndPoint} ${projectName}
                ${content}
                CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                `
            );

            const decoded = this.encodingService.decode(content);

            this.setCTPInfo();
            ctpBody.httpMethod = 'POST';
            ctpBody.input = {
                "javaSourceCode": decoded,
                "gitComment": gitCommitMsg
            };

            // this.logger.info(
            //     `decoded content:
            //     ${decoded}`
            // );

            const response = await fetch(CTPInfo.location + ctpUrl, {
                method: 'POST',
                headers: ctpHeaders,
                body: JSON.stringify(ctpBody),
                agent: httpsAgent
            });

            if (response.ok) {
                const json = await response.json();
                this.logger.info(`${ctpBody.apiEndPoint} ${response.statusText}`);

                return Promise.resolve(json);
            }
            else {
                try {
                    const errResp = this.handleError(ctpBody.apiEndPoint, response);
                    return Promise.resolve(errResp);
                }
                catch (err) {
                    throw err;
                }
                // const data = await response.json();
                // const error1 = (data && data.message) || response.status;

                // this.logger.error(
                //     `Error Message: ${error1}`
                // );

                // return Promise.reject(new Error(error1));
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async getJavaClass(projectName: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'javaservice/' + projectName + '/source';

            try {
                this.logger.info(
                    `entered InvokeBackendServiceImpl getJavaClass 
                    Endpoint: ${ctpBody.apiEndPoint} Package: ${projectName} 
                    CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                    `
                );

                this.setCTPInfo();
                ctpBody.httpMethod = 'GET';
                ctpBody.input = {};

                const response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(`${ctpBody.apiEndPoint} passed.`);
                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${ctpBody.apiEndPoint} failed. ${result.statusText}`);
                    // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
                }
            }
            catch (error) {
                this.reportError('getJavaClass', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async getJavaServices(projectName: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'javaservice/' + projectName + '?sortAscending=true';

            try {
                this.logger.info(
                    `entered InvokeBackendServiceImpl getJavaServices 
                    ${ctpBody.apiEndPoint} ${projectName}
                    CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                    `
                );

                this.setCTPInfo();
                ctpBody.httpMethod = 'GET';
                ctpBody.input = {};

                const response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(`${ctpBody.apiEndPoint} passed.`);
                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${ctpBody.apiEndPoint} failed. ${result.statusText}`);
                    // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
                }
            }
            catch (error) {
                this.reportError('getJavaServices', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async createNewJavaService(projectName: string, javaServiceName: string, gitCommitMsg: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'javaservice/' + projectName + '/' + javaServiceName;

            this.logger.info(
                `entered JavaServiceBackendServiceImpl createNewJavaService:
                Server Url: ${ctpBody.apiEndPoint} Pakage: ${projectName} Java Service: ${javaServiceName}
                `
            );

            this.setCTPInfo();
            ctpBody.httpMethod = 'POST';
            ctpBody.input = { "gitComment": gitCommitMsg };

            let response: any;
            try {
                response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(`${response.statusText}`);
                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${response.statusText}`);
                    // throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                this.reportError('createNewJavaService', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async duplicateJavaService(projectName: string, sourceJavaServiceName: string,
        targetJavaServiceName: string, gitCommitMsg: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'javaservice/' + projectName + '?action=duplicate&sources[]=' +
                sourceJavaServiceName + '&targets[]=' + targetJavaServiceName;

            this.logger.info(
                `entered JavaServiceBackendServiceImpl duplicateJavaService:
                Server Url: ${ctpBody.apiEndPoint} Pakage: ${projectName} Source Java Service: ${sourceJavaServiceName}  Target Java Service: ${targetJavaServiceName}
                `
            );

            this.setCTPInfo();
            ctpBody.httpMethod = 'POST';
            ctpBody.input = { "gitComment": gitCommitMsg };

            let response: any;
            try {
                response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(`${response.statusText}`);
                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${response.statusText}`);
                    // throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                this.reportError('duplicateJavaService', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async pasteJavaService(projectName: string, sourceJavaServiceNames: string[],
        targetJavaServiceNames: string[], gitCommitMsg: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            let javaServiceParams = '?action=paste';
            for (const sourceJavaServiceName of sourceJavaServiceNames) {
                javaServiceParams += '&sources[]=' + sourceJavaServiceName;
            }
            for (const targetJavaServiceName of targetJavaServiceNames) {
                javaServiceParams += '&targets[]=' + targetJavaServiceName;
            }
            ctpBody.apiEndPoint = 'javaservice/' + projectName + javaServiceParams;

            this.logger.info(
                `entered JavaServiceBackendServiceImpl pasteJavaService:
                Server Url: ${ctpBody.apiEndPoint} Pakage: ${projectName} Source Java Service: ${sourceJavaServiceNames}  Target Java Service: ${targetJavaServiceNames}
                `
            );

            this.setCTPInfo();
            ctpBody.httpMethod = 'POST';
            ctpBody.input = { "gitComment": gitCommitMsg };

            let response: any;
            try {
                response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(`${response.statusText}`);
                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${response.statusText}`);
                    // throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                this.reportError('pasteJavaService', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async deleteJavaService(projectName: string, javaServiceNames: string[], gitCommitMsg: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            let javaServiceParams = '';
            for (let i = 0; i < javaServiceNames.length; i++) {
                if (i === 0) {
                    javaServiceParams += '?names[]=' + javaServiceNames[i];
                }
                else {
                    javaServiceParams += '&names[]=' + javaServiceNames[i];
                }
            }
            ctpBody.apiEndPoint = 'javaservice/' + projectName + javaServiceParams;

            this.logger.info(
                `entered JavaServiceBackendServiceImpl deleteJavaService:
                Server Url: ${ctpBody.apiEndPoint} Pakage: ${projectName} Java Service(s): ${javaServiceNames}
                `
            );

            this.setCTPInfo();
            ctpBody.httpMethod = 'DELETE';
            ctpBody.input = { "gitComment": gitCommitMsg };

            let response: any;

            // const result = await fetch(CTPInfo.location + ctpUrl, {
            //     method: 'POST',
            //     headers: ctpHeaders,
            //     body: JSON.stringify(ctpBody),
            //     agent: httpsAgent
            // });

            try {
                response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    return response;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${response.statusText}`);
                    // throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                this.reportError('deleteJavaService', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async getJavaServiceProperties(projectName: string, javaService: string): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            ctpBody.apiEndPoint = 'javaservice/' + projectName + '/' + javaService +
                '?properties[]=signature&properties[]=svc_in_validator_options&properties[]=svc_out_validator_options';

            try {
                this.logger.info(
                    `entered InvokeBackendServiceImpl getJavaServiceProperties 
                    ${CTPInfo.location} ${javaService}
                    `
                );

                this.setCTPInfo();
                ctpBody.httpMethod = 'GET';
                ctpBody.input = {};

                this.logger.info(
                    `============================== URL =  
                    ${CTPInfo.location + ctpUrl}
                    `
                );

                const response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    const json = await response.json();
                    this.logger.info(
                        `Response: 
                        ${JSON.stringify(json)}
                        `
                    );

                    return json;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${ctpBody.apiEndPoint} failed. ${result.statusText}`);
                    // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
                }
            }
            catch (error) {
                this.reportError('getJavaServiceProperties', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async setJavaServiceProperties(projectName: string, javaService: string, jsProperties: any): Promise<any> {

        const edgeStatus = await this.checkEdgeServer();
        if (edgeStatus && edgeStatus.$status === 'success') {
            this.logger.info(
                `entered InvokeBackendServiceImpl setJavaServiceProperties 
                ${CTPInfo.location} ${javaService}
                `
            );

            this.setCTPInfo();
            ctpBody.httpMethod = 'PATCH';
            ctpBody.input = jsProperties;

            this.logger.info(`input = ${ctpBody.input}`);

            ctpBody.apiEndPoint = 'javaservice/' + projectName + '/' + javaService +
                '?properties[]=signature&properties[]=svc_in_validator_options&properties[]=svc_out_validator_options';

            let response: any;

            try {
                response = await fetch(CTPInfo.location + ctpUrl, {
                    method: 'POST',
                    headers: ctpHeaders,
                    body: JSON.stringify(ctpBody),
                    agent: httpsAgent
                });
                if (response.ok) {
                    return response;
                }
                else {
                    try {
                        const errResp = this.handleError(ctpBody.apiEndPoint, response);
                        return Promise.resolve(errResp);
                    }
                    catch (err) {
                        throw err;
                    }
                    // this.logger.error(`${response.statusText}`);
                    // throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                this.reportError('setJavaServiceProperties', ctpBody.apiEndPoint, error);
                throw error;
            }
        }
        else {
            if (edgeStatus.errorMessage) {
                return edgeStatus;
            }
            this.logger.error(`${ctpBody.apiEndPoint} failed.`);
            throw new Error(`EDGE_UNREACHABLE`);
        }
    }

    async performScaffolding(services: string): Promise<any> {

        const scaffoldingInput = new ScaffoldingInput(ServiceConfig.packageName);
        const servicesArr: string[] = services.split(',');
        scaffoldingInput.setServices(servicesArr);

        ctpBody.apiEndPoint = 'scaffolding';

        try {
            this.logger.info(
                `entered InvokeBackendServiceImpl performScaffolding 
                Endpoint: ${ctpBody.apiEndPoint} Project: ${ServiceConfig.projectName} 
                Package: ${ServiceConfig.packageName} 
                CSRF Token: ${CTPInfo.csrfToken} Auth Token: ${CTPInfo.authToken} Cookie: ${CTPInfo.cookie}
                `
            );

            const scaffoldingStr = JSON.stringify(scaffoldingInput);
            this.logger.info(
                `Scaffolding input:  
                ${scaffoldingStr}
                `
            );

            this.setCTPInfo();
            ctpBody.httpMethod = 'POST';
            ctpBody.input = scaffoldingInput;

            const response = await fetch(CTPInfo.location + ctpUrl, {
                method: 'POST',
                headers: ctpHeaders,
                body: JSON.stringify(ctpBody),
                agent: httpsAgent
            });
            if (response.ok) {
                const json = await response.json();
                this.logger.info(`${ctpBody.apiEndPoint} passed.`);
                return json;
            }
            else {
                try {
                    const errResp = this.handleError(ctpBody.apiEndPoint, response);
                    return Promise.resolve(errResp);
                }
                catch (err) {
                    throw err;
                }
                // this.logger.error(`${ctpBody.apiEndPoint} failed. ${result.statusText}`);
                // throw new Error(`HTTP Error Response: ${result.status} ${result.statusText}`);
            }
        }
        catch (error) {
            this.reportError('performScaffolding', ctpBody.apiEndPoint, error);
            throw error;
        }
    }

    private handleError(endpoint: any, response: any): any {
        this.logger.error(`${endpoint} failed. ${response.status} ${response.statusText}`);

        if (response.status === Unauthorized || response.status === Forbidden) {
            return { errorMessage: response.statusText, errorCode: response.status };
        }
        throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
    }

    private reportError(apiName: string, apiUrl: string, error: any) {
        this.logger.error(
            `${apiName}: invoking ** ${apiUrl} failed with an error
            ${error}`
        );
        console.error(error);
        let errorBody = '';
        let errorMessage = 'An error has occurred in invoke-backend-service.ts';
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.response && error.response.text()) {
            errorBody = error.response.text();
        }
        else if (error.response && error.response.message) {
            errorBody = error.response.message;
        }
        else if (error.message) {
            errorBody = error.message;
        }
        console.error(`Error body: ${errorBody}`);
        this.logger.error(`Error body: ${errorBody}`);
        this.logger.error(`Error Message: ${errorMessage}`);
    }
}

    // catchError(error) {
    //     console.error(error);
    //     const errorBody = error.response.text();
    //     console.error(`Error body: ${errorBody}`);
    //     this.logger.warn(
    //         `Error body:
    //         ${errorBody}`
    //     );
    //     throw error

    // }

// class HTTPResponseError extends Error {
//     response: any;
//     constructor(response) {
//         super(`HTTP Error Response: ${ response.status } ${ response.statusText } `);
//         this.response = response;
//     }
// }