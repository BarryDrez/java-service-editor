import { JsonRpcServer } from '@theia/core/lib/common/messaging';

export const InvokeBackendService = Symbol('InvokeBackendService');
export const HELLO_BACKEND_PATH = '/services/helloBackend';
export const INVOKE_BACKEND_PATH = '/services/invokeService';

export interface InvokeBackendService {

    isSessionActive(): Promise<any>;

    getJavaServiceInfo(): Promise<any>;

    getReferencedLibrariesJars(libDir: any): Promise<any>;

    updateClasspath(wsPath: string, libPath: string, remove: boolean): Promise<any>;

    isClassInWorkspace(classUri: string): Promise<any>;

    getUserInfo(): Promise<any>;

    getEdgeServers(): Promise<any>;

    getJarFilesInPackage(packageName: string, libDir: string, removeExisting: boolean): Promise<any>;

    removeAllJarFilesInWorkspaceProject(libDir: string): Promise<any>;

    downloadJarFileInPackage(libDir: string, packageName: string, jarFile: string): Promise<any>;

    debugService(javaService: string, agentID: string, agentGroup: string): Promise<any>;

    getJavaClass(projectName: string): Promise<any>;

    saveOrCompileJavaClass(projectName: string, content: any, action: string, gitCommitMsg: string): Promise<any>;

    createNewJavaService(projectName: string, javaServiceName: string, gitCommitMsg: string): Promise<any>;

    duplicateJavaService(projectName: string, sourceJavaServiceName: string,
        targetJavaServiceName: string, gitCommitMsg: string): Promise<any>;

    pasteJavaService(projectName: string, sourceJavaServiceNames: string[],
        targetJavaServiceNames: string[], gitCommitMsg: string): Promise<any>;

    deleteJavaService(projectName: string, javaServiceName: string[], gitCommitMsg: string): Promise<any>;

    getJavaServices(projectName: string): Promise<any>;

    getJavaServiceProperties(projectName: string, javaService: string): Promise<any>;

    setJavaServiceProperties(projectName: string, javaService: string,
        jsProperties: any): Promise<any>;

    performScaffolding(services: string): Promise<any>;
}
export const InvokeBackendWithClientService = Symbol('InvokeBackendWithClient');
export const INVOKE_BACKEND_WITH_CLIENT_PATH = '/services/withClient';

export interface InvokeBackendWithClientService extends JsonRpcServer<InvokeBackendClient> {
    greet(): Promise<string>
}
export const InvokeBackendClient = Symbol('InvokeBackendClient');
export interface InvokeBackendClient {
    getName(): Promise<string>;
}
