# GitHub Pagesへの公開

公開先の予定は `greenplus/soinsle`、URLは `https://greenplus.github.io/soinsle/` です。リポジトリ作成と公開の完了はGitHub側で確認してください。

## GitHub CLIを使う場合

GitHub CLIがインストールされ、greenplusとしてログインしている環境で、プロジェクトのルートから実行します。パスワードやトークンをファイルに書く必要はありません。

```sh
gh auth status
git init -b main
git config user.name "greenplus"
git config user.email "69065910+greenplus@users.noreply.github.com"
git add index.html styles.css app.mjs core.mjs icon.svg .nojekyll .gitignore package.json data scripts tests .github README.md DEPLOY.md
git commit -m "Create soinsle puzzle game"
gh repo create greenplus/soinsle --public --source=. --remote=origin --push
gh api --method POST repos/greenplus/soinsle/pages -f build_type=workflow
gh workflow run pages.yml
gh run list --repo greenplus/soinsle --workflow pages.yml
```

すでにリポジトリやPagesがある場合は、新規作成を繰り返さず状態を確認してください。上記の作成者設定はこのリポジトリにだけ適用されます。実メールではなくGitHubのnoreplyアドレスであることを、最初のコミット前に確認します。既存リポジトリを上書きするforce pushは不要です。

## ブラウザーで設定する場合

1. greenplusの公開リポジトリ `soinsle` を新規作成します。
2. ソースを階層ごと保存します。`.github/workflows/pages.yml` と `data/problems.json` の配置に注意してください。
3. Settings → Pages → Source で **GitHub Actions** を選びます。
4. Actionsの **Test and publish soinsle** を実行します。初回push時の実行がPages未設定で失敗した場合は、設定後に再実行します。
5. Actions成功後に公開URLを開きます。

## 公開対象

サイトに配置するのは `index.html`、`styles.css`、`app.mjs`、`core.mjs`、`icon.svg`、`.nojekyll`、`data/problems.json` のみです。ソースリポジトリにはテスト・生成器・README・公開設定も保存します。

`.tools/`、`reports/`、`internal/`、`.agents/`、`.codex/`、環境変数ファイル、制作資料、テスト画像、ZIP、インストール済みライブラリは公開しません。フロントエンドのみのため、RailwayやDB・秘密キーの設定は不要です。

## 公開後の確認

- トップページと `data/problems.json` がHTTP 200で読み込める。
- 日本時間の同じ日に同じ手札が出る。
- 練習への切り替えと次の問題。
- 指示書の `/#sample` で2手301点・3手159点。
- 再読み込み後の復元、役の取り消し、共有。
- スマートフォン幅で手札と入力欄が収まり、タップできる。

更新時は `main` にpushするとテスト後に自動公開します。
