import * as React from 'react';

export class ErrorBoundary extends React.Component<Props> {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		// You can also log the error to an error reporting service
		console.log(error.message);
		console.log(error.stack);
		// logErrorToMyService(error, errorInfo);
	}

	render() {
		let st: any = this.state;
		if (st.hasError) {
			//You can render any custom fallback UI
			return <h1>Something went wrong.</h1>;
		}

		return this.props.children;
	}
}

export interface Props {
	children: any;
}