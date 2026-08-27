# Claude Code統合

iNeedRouterをClaude Code CLIと統合し、AnthropicのAPIリクエストをiNeedRouterのインテリジェントルーティングシステム経由でルーティングします。

## 前提条件

- Claude Code CLIがインストール済み
- iNeedRouterがローカルで動作中、またはクラウドエンドポイントが設定済み
- iNeedRouterダッシュボードからのAPIキー

## セットアップ

### 1. 環境変数を設定

シェル設定ファイル (`~/.bashrc`、`~/.zshrc`、または `~/.bash_profile`) で以下の環境変数を設定:

```bash
# iNeedRouter用Base URL
export ANTHROPIC_BASE_URL="http://localhost:20128/v1"

# オプション: エイリアス用のデフォルトモデルを設定
export ANTHROPIC_DEFAULT_OPUS_MODEL="cc/claude-opus-4-5-20251101"
export ANTHROPIC_DEFAULT_SONNET_MODEL="cc/claude-sonnet-4-5-20250929"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="cc/claude-haiku-4-5-20251001"
```

### 2. シェル設定をリロード

```bash
source ~/.zshrc  # または ~/.bashrc
```

### 3. 設定を確認

環境変数が正しく設定されているか確認:

```bash
echo $ANTHROPIC_BASE_URL
```

## モデルエイリアス

Claude CodeはiNeedRouterモデルにマッピングされる以下のモデルエイリアスをサポート:

| エイリアス | モデル | 環境変数 |
|-------|-------|---------------------|
| `opus` | Claude Opus 4.5 | `ANTHROPIC_DEFAULT_OPUS_MODEL` |
| `sonnet` | Claude Sonnet 4.5 | `ANTHROPIC_DEFAULT_SONNET_MODEL` |
| `haiku` | Claude Haiku 4.5 | `ANTHROPIC_DEFAULT_HAIKU_MODEL` |

## 使用例

### モデルエイリアスを使用

```bash
# Opusモデルを使用
claude --model opus "Explain quantum computing"

# Sonnetモデルを使用
claude --model sonnet "Write a Python function"

# Haikuモデルを使用
claude --model haiku "Quick code review"
```

### フルモデル名を使用

```bash
claude --model cc/claude-opus-4-5-20251101 "Your prompt here"
```

## 設定ファイル

Claude Codeは設定を `~/.claude/settings.json` に保存します。必要に応じてこのファイルを手動で編集できます:

```json
{
  "baseUrl": "http://localhost:20128/v1",
  "defaultModel": "sonnet"
}
```

## トラブルシューティング

### 接続の問題

接続エラーが発生した場合:

1. iNeedRouterが動作中か確認: `curl http://localhost:20128/health`
2. 環境変数が正しく設定されているか確認
3. ファイアウォールがポート20128をブロックしていないか確認

### モデルが見つからない

「model not found」エラーが発生した場合:

1. モデル名がiNeedRouterの設定と一致しているか確認
2. iNeedRouterダッシュボードでプロバイダー接続がアクティブか確認
3. 接続されたプロバイダーでモデルが利用可能か確認

## クラウドエンドポイント

localhostの代わりにiNeedRouterクラウドエンドポイントを使用するには:

```bash
export ANTHROPIC_BASE_URL="https://ineed.web.id"
```

iNeedRouterクラウドダッシュボードでAPIキーが設定されていることを確認してください。
