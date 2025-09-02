import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('ErrorBoundary: Error caught:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary: Full error details:', {
      error: error.toString(),
      errorInfo,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    console.log('ErrorBoundary: User requested page reload');
    window.location.reload();
  };

  private handleRetry = () => {
    console.log('ErrorBoundary: User requested retry');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-destructive">
                Algo deu errado
              </h1>
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado na aplicação. Tente uma das opções abaixo.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Tentar novamente
              </button>
              
              <button
                onClick={this.handleReload}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors"
              >
                Recarregar página
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-muted p-4 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">
                  Detalhes técnicos (desenvolvimento)
                </summary>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-destructive">Erro:</p>
                    <pre className="text-xs bg-background p-2 rounded overflow-auto">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  
                  {this.state.error.stack && (
                    <div>
                      <p className="text-xs font-medium text-destructive">Stack trace:</p>
                      <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <p className="text-xs font-medium text-destructive">Component stack:</p>
                      <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;