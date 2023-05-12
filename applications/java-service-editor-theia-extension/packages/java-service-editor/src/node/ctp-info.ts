export abstract class CTPInfo {

	private static _location: string;
	private static _csrfToken: string;
	private static _authToken: string;
	private static _cookie: string;

	public static get location(): string {
		return this._location;
	}

	public static set location(location: string) {
		this._location = location;
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

	public static get cookie(): string {
		return this._cookie;
	}

	public static set cookie(cookie: string) {
		this._cookie = cookie;
	}

	public static load(location: string, csrfToken: string, authToken: string, jsCookie: string,
		agentId?: string, agentGroup?: string): void {

		CTPInfo._location = location;
		CTPInfo._csrfToken = csrfToken;
		CTPInfo._authToken = authToken;
		CTPInfo._cookie = jsCookie;
	}
}
