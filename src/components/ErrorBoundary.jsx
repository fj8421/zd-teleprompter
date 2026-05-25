import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text)',
        background: 'var(--bg)'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 600 }}>出错了</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
          {this.state.error?.message || '发生未知错误，请刷新重试。'}
        </div>
        <button
          className="btn btn-primary"
          onClick={this.handleReload}
          style={{ padding: '8px 16px', fontSize: '15px' }}
        >
          重新加载
        </button>
      </div>
    );
  }
}
