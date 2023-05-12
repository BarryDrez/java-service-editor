export class JavaServiceInfo {

	public javaSuiteName: string;
	public projectName: string;
	public projectId: string;
	public groupName: string;
	public packageName: string;
	public folderNS: string;
	public javaServiceName: string;
	public originServer: string;
	public isReadOnly: boolean = false;
	public csrfToken: string;
	public authToken: string;

	constructor(javaSuiteName: string, projectName: string, projectId: string, groupName: string, packageName: string,
		javaServiceName: string, folderNS: string, originServer: string, isReadOnly: boolean, csrfToken: string, authToken: string) {

		this.javaSuiteName = javaSuiteName;
		this.projectName = projectName;
		this.projectId = projectId;
		this.groupName = groupName;
		this.packageName = packageName;
		this.javaServiceName = javaServiceName;
		this.folderNS = folderNS;
		this.originServer = originServer;
		this.isReadOnly = isReadOnly;
		this.csrfToken = csrfToken;
		this.authToken = authToken;
	}
}
