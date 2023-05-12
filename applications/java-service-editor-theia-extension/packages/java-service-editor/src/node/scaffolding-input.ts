import { ServiceConfig } from '../common/java-service-config';

export class ScaffoldingInput {

	public packageName: string;
	public services: Service[];
	public workflowName: string;
	public tags: string[];

	constructor(packageName: string) {
		this.packageName = packageName;
		this.services = [];
		this.tags = [];
	}

	setServices(services: string[]) {
		for (const svc of services) {
			this.addService(svc);
		}
		this.workflowName = this.services[0].serviceName;
	}

	addService(service: string) {
		const serviceName = 'edge.' + ServiceConfig.projectName.toLowerCase() + '.javaservices:' + service;
		this.services.push(new Service(serviceName));
		this.tags.push(service);
	}
}

export class Service {
	public serviceName: string;

	constructor(serviceName: string) {
		this.serviceName = serviceName;
	}
}
