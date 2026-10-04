"use client";

import { Component, type ReactNode } from "react";

interface ModelErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ModelErrorBoundaryState {
  failed: boolean;
}

export class ModelErrorBoundary extends Component<
  ModelErrorBoundaryProps,
  ModelErrorBoundaryState
> {
  state: ModelErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D model failed to load", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      this.props.fallback ?? (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted">
          3D preview unavailable
        </div>
      )
    );
  }
}
