import { injectable, inject } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ILogger } from '@theia/core';
import { ServiceConfig } from '../common/java-service-config';
import { CTPInfo } from './ctp-info';
import express = require('@theia/core/shared/express');

const READY_STATE = "READY";
const JSE_SERVICE_NAME = "java-services";

@injectable()
export class JavaServiceEndpoint implements BackendApplicationContribution {
	@inject(ILogger)

	private readonly logger: ILogger;

	configure(app: express.Application): void {
		app.get('/jsehealth', (request, response) => {
			if (CTPInfo.location && ServiceConfig.javaServiceName) {
				response.status(200).send({ status: "UP" });
			}
			else {
				response.status(503).send({ status: 'Missing input' });

			}
		});
		app.get('/health', (request, response) => {
			const healthcheck = {
				uptime: process ? process.uptime() : "UNKNOWN",
				status: "UP",
				message: "OK",
				component: JSE_SERVICE_NAME,
				timestamp: Date.now()
			};
			try {
				response.status(200).send(healthcheck)
			} catch (error) {
				response.status(503).send({ component: JSE_SERVICE_NAME, message: error });
			};
		});
		app.get("/ready", (req, res) => res.status(200).json({
			status: "ok", component: JSE_SERVICE_NAME,
			timestamp: Date.now()
		}));
		app.get("/live", (req, res) => res.status(200).json({
			status: "ok", component: JSE_SERVICE_NAME,
			timestamp: Date.now()
		}));

		app.post('/jseinit', (request, response) => {
			this.logger.info(`********************** jseinit *********************`);
			if (request.headers) {
				this.logger.info(`********************** CSRF TOKEN ********************* ${request.headers.csrf_token}`);
				for (let hdr in request.headers) {
					this.logger.info(`********************** Header: ${hdr} *********************`);
					console.log(hdr);
					console.log(request.headers[hdr]);
				}
				if (request.query) {
					for (let param in request.query) {
						this.logger.info(`********************** Query Parameter: ${param} *********************`);
						console.log(param);
						console.log(request.query[param]);
					}

					if (request.headers.csrf_token && request.query.ctpLocation) {
						CTPInfo.load(decodeURIComponent(request.query.ctpLocation as string), request.headers.csrf_token as string,
							request.headers.authtoken as string, request.headers.jscookie as string);

						console.log('CTP Info received,        location:   ' + CTPInfo.location);
						console.log('                          csrfToken:  ' + CTPInfo.csrfToken);
						console.log('                          authtoken:  ' + CTPInfo.authToken);
						console.log('                          cookie:     ' + CTPInfo.cookie);

						ServiceConfig.projectName = decodeURIComponent(request.query.projectName as string);
						ServiceConfig.packageName = decodeURIComponent(request.query.packageName as string);
						ServiceConfig.projectId = decodeURIComponent(request.query.projectId as string);
						ServiceConfig.groupName = decodeURIComponent(request.query.groupName as string);
						ServiceConfig.javaServiceName = decodeURIComponent(request.query.javaServiceName as string);
						ServiceConfig.folderNS = decodeURIComponent(request.query.folderNS as string);
						ServiceConfig.originServer = decodeURIComponent(request.query.originServer as string);
						ServiceConfig.agentID = decodeURIComponent(request.query.agentID as string);
						ServiceConfig.agentGroup = decodeURIComponent(request.query.agentGroup as string);
						const sReadOnly = decodeURIComponent(request.query.isReadOnly as string);
						ServiceConfig.readOnly = sReadOnly === 'true';
						ServiceConfig.csrfToken = CTPInfo.csrfToken;
						ServiceConfig.authToken = CTPInfo.authToken;

						ServiceConfig.javaSuiteName = ServiceConfig.groupName;

						console.log('Request body received, projectName:   ' + ServiceConfig.projectName);
						console.log('                       projectId:     ' + ServiceConfig.projectId);
						console.log('                       groupName:     ' + ServiceConfig.groupName);
						console.log('                       packageName:   ' + ServiceConfig.packageName);
						console.log('                       javaService:   ' + ServiceConfig.javaServiceName);
						console.log('                       folderNS:      ' + ServiceConfig.folderNS);
						console.log('                       originServer:  ' + ServiceConfig.originServer);
						console.log('                       javaSuiteName: ' + ServiceConfig.javaSuiteName);
						console.log('                       javaClass:     ' + ServiceConfig.javaClass);

						if (CTPInfo.location && ServiceConfig.projectName && ServiceConfig.javaServiceName) {
							response.status(200).send({ msg: 'JavaServiceEndpoint - data received successfully =========================>  April 25: 7:40 AM' });
						}
						else {
							response.sendStatus(400);
						}
					}
					else {
						console.error('CSRF Token/CTP Location not present');
						response.sendStatus(400);
					}
				}
				else {
					console.error('No query parameters provided');
					response.sendStatus(400);
				}
			}
			else {
				console.error('No headers present');
				response.sendStatus(400);
			}
		});
	}
}
