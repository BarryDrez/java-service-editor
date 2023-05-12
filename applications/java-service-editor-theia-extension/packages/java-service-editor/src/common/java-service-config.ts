import { JavaServiceInfo } from '../common/java-service-info';

const JAVA_EXT = '.java';
const SLASH = '/';
const DOT = '.';
const LIB_FOLDER = '/lib';

export abstract class ServiceConfig {

	private static _javaSuiteName: string;
	private static _javaSuiteTitle: string;
	private static _projectName: string;
	private static _projectId: string;
	private static _groupName: string;
	private static _packageName: string;
	private static _javaServiceName: string;
	private static _folderNS: string;
	private static _csrfToken: string;
	private static _authToken: string;

	private static _originServer?: string;

	private static _agentID: string = 'default';
	private static _agentGroup: string = 'Default';
	private static _edgeServerName: string;

	private static _serviceNameAuthor: string;
	private static _serviceCommitMessage: string;

	private static _isReadOnly?: boolean;
	private static _breakpointsEnabled?: boolean;


	public static get javaSuiteName(): string {
		return this._javaSuiteName;
	}

	public static set javaSuiteName(javaSuiteName: string) {
		this._javaSuiteName = javaSuiteName;
	}

	public static get javaSuiteTitle(): string {
		return this._javaSuiteTitle;
	}

	public static set javaSuiteTitle(javaSuiteTitle: string) {
		this._javaSuiteTitle = javaSuiteTitle;
	}

	public static get projectName(): string {
		return this._projectName;
	}

	public static set projectName(projectName: string) {
		this._projectName = projectName;
	}

	public static get groupName(): string {
		return this._groupName;
	}

	public static set groupName(groupName: string) {
		this._groupName = groupName;
	}

	public static get projectId(): string {
		return this._projectId;
	}

	public static set projectId(projectId: string) {
		this._projectId = projectId;
	}

	public static get packageName(): string {	//TODO: Fix this
		return this._packageName;
	}

	public static set packageName(packageName: string) {
		this._packageName = packageName;
	}

	public static get javaServiceName(): string {
		return this._javaServiceName;
	}

	public static set javaServiceName(javaServiceName: string) {
		this._javaServiceName = javaServiceName;
	}

	public static get folderNS(): string {
		return this._folderNS;
	}

	public static set folderNS(folderNS: string) {
		this._folderNS = folderNS;
	}

	public static get edgeFolderName(): string {
		return this._folderNS.substring(0, this._folderNS.indexOf(DOT));
	}

	public static get subProjFolderName(): string {
		const nsArray = this._folderNS.split(DOT)
		return nsArray[1];
	}

	public static get javaServicesFolderName(): string {
		return this._folderNS.substring(this._folderNS.lastIndexOf(DOT) + 1);
	}

	public static get csrfToken(): string {
		return this._csrfToken;
	}

	public static set csrfToken(csrfToken: string) {
		this._csrfToken = csrfToken;
	}

	public static get authToken(): string {
		return this._authToken;
	}

	public static set authToken(authToken: string) {
		this._authToken = authToken;
	}

	public static get originServer(): string {
		return this._originServer;
	}

	public static set originServer(originServer: string) {
		this._originServer = originServer;
	}

	public static get agentID(): string {
		return this._agentID;
	}

	public static set agentID(agentID: string) {
		this._agentID = agentID;
	}

	public static get agentGroup(): string {
		return this._agentGroup;
	}

	public static set agentGroup(agentGroup: string) {
		this._agentGroup = agentGroup;
	}

	public static get edgeServerName(): string {
		return this._edgeServerName;
	}

	public static set edgeServerName(edgeServerName: string) {
		this._edgeServerName = edgeServerName;
	}

	public static get serviceNameAuthor(): string {
		return this._serviceNameAuthor;
	}

	public static set serviceNameAuthor(serviceNameAuthor: string) {
		this._serviceNameAuthor = serviceNameAuthor;
	}

	public static get serviceCommitMessage(): string {
		return this._serviceCommitMessage;
	}

	public static set serviceCommitMessage(serviceCommitMessage: string) {
		this._serviceCommitMessage = serviceCommitMessage;
	}

	public static get breakpointsEnabled(): boolean {
		return this._breakpointsEnabled;
	}

	public static set breakpointsEnabled(breakpointsEnabled: boolean) {
		this._breakpointsEnabled = breakpointsEnabled;
	}

	public static get isReadOnly(): boolean {
		return this._isReadOnly;
	}

	public static set readOnly(isReadOnly: boolean) {
		this._isReadOnly = isReadOnly;
	}

	public static get javaClassFullPath(): string {
		return this.projectName + SLASH + this.folderNS.replace(/\./g, SLASH) + SLASH + this.javaClass;
	}

	public static get javaServicesFullPath(): string {
		return this.javaClassFullPath.substring(0, this.javaClassFullPath.lastIndexOf(SLASH));
	}

	public static get referencedJarsFullPath(): string {
		return this.projectName + SLASH + LIB_FOLDER;
	}

	public static get javaClass(): string {
		return this._javaSuiteName + JAVA_EXT;
	}

	public static loadJavaServiceProperties(projectName: string, projectId: string, groupName: string, packageName: string,
		javaSuiteName: string, javaServiceName: string, folderNS: string, originServer: string, isReadOnly: any): void {

		ServiceConfig.projectName = projectName;
		ServiceConfig.projectId = projectId;
		ServiceConfig.groupName = groupName;
		ServiceConfig.packageName = packageName;
		ServiceConfig.javaSuiteName = javaSuiteName;
		ServiceConfig.javaServiceName = javaServiceName;
		ServiceConfig.folderNS = folderNS;
		ServiceConfig.originServer = originServer;
		const sReadOnly = isReadOnly;
		if (sReadOnly === 'true') {
			ServiceConfig.readOnly = true;
		}

		ServiceConfig.javaSuiteName = groupName;
	}

	public static loadJavaServiceFromInfo(javaServiceInfo: JavaServiceInfo): void {

		ServiceConfig.projectName = javaServiceInfo.projectName;
		ServiceConfig.projectId = javaServiceInfo.projectId;
		ServiceConfig.groupName = javaServiceInfo.groupName;
		ServiceConfig.packageName = javaServiceInfo.packageName;
		ServiceConfig.javaSuiteName = javaServiceInfo.javaSuiteName;
		ServiceConfig.javaServiceName = javaServiceInfo.javaServiceName;
		ServiceConfig.folderNS = javaServiceInfo.folderNS;
		ServiceConfig.originServer = javaServiceInfo.originServer;
		ServiceConfig.readOnly = javaServiceInfo.isReadOnly;
		ServiceConfig.csrfToken = javaServiceInfo.csrfToken;
		ServiceConfig.authToken = javaServiceInfo.authToken;
	}
}
