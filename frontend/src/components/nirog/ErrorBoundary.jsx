import React from "react";
import ServerError from "@/pages/ServerError";

/**
 * ErrorBoundary — wraps any subtree and catches runtime errors.
 * Falls back to <ServerError /> (the 500 error page) when an error is caught.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ServerError error={this.state.error} />;
    }

    return this.props.children;
  }
}
