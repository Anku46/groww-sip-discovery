import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

/** Catches render errors so one broken tab doesn't take down the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="card mx-auto my-8 max-w-lg p-6 text-center">
        <p className="text-base font-semibold">{this.props.label ?? 'This section'} couldn’t be displayed</p>
        <p className="mt-2 text-sm text-ink-muted">Something went wrong while rendering it. The other tabs still work.</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    )
  }
}
