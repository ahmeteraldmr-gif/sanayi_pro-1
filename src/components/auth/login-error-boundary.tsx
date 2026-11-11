"use client";

import React, { Component, type ReactNode } from "react";
import { LoginStaticFallback } from "./login-fallback";

interface Props {
  children: ReactNode;
  redirectTo?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class LoginErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Login form error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <LoginStaticFallback redirectTo={this.props.redirectTo} isFallback />;
    }
    return this.props.children;
  }
}
