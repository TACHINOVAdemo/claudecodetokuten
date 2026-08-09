# お仕事スイッチ

仕事の種類ごとに、いつも開くWebページ・ファイル・フォルダをまとめて登録しておき、ボタン一つで全部開くための常駐型デスクトップアプリです。**Windows 10/11 と macOS** で動きます。

Claude Code を使ったセミナーのデモとして作られたアプリで、このリポジトリには仕様書と実装の両方が入っています。

## このリポジトリの中身

| パス | 内容 |
|---|---|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | 仕様書。何を作るかを日本語で書き下したもの |
| [`ClaudeCodeSeminarDemoApp/`](ClaudeCodeSeminarDemoApp/) | 実装（Electronアプリ本体） |
| [`ClaudeCodeSeminarDemoApp/README.md`](ClaudeCodeSeminarDemoApp/README.md) | アプリの詳しい説明・使い方・安全設計 |

## 受け取った人がまず読むもの

アプリを動かすところまでは [`ClaudeCodeSeminarDemoApp/README.md`](ClaudeCodeSeminarDemoApp/README.md) の「初回セットアップ」に従ってください。前提は **Node.js 18以降** だけです。

```bash
cd ClaudeCodeSeminarDemoApp
npm install
npm start
```

デスクトップアイコンから起動できるようにする手順（ターミナルを閉じてもアプリが終了しない形）も、同じREADMEに書いてあります。

## Claude Code に任せる場合

手順を自分でなぞらなくても、Claude Code にこのリポジトリを渡せば、取得から起動まで代わりにやってもらえます。Claude Code を起動して、次のように頼んでください。

```
https://github.com/TACHINOVAdemo/claudecodetokuten を clone して、
ClaudeCodeSeminarDemoApp を npm install してから npm start で起動して。
```

## 書き換えが必要なところ

そのままでも動きますが、自分用にする際は次を触ることになります。

| 対象 | 何をするか |
|---|---|
| 業務モードの登録内容 | アプリの画面から追加します。ファイルを直接編集する必要はありません |
| `ClaudeCodeSeminarDemoApp/build/icon.png` / `icon.ico` | アイコンを自分のロゴに変えたい場合に差し替えます |
| `ClaudeCodeSeminarDemoApp/.claude/CLAUDE.md` | Claude Code に改造を頼むときの方針書。安全ルールが書いてあるので、機能追加の前に読ませてください |

登録した内容は `ClaudeCodeSeminarDemoApp/data/` にJSONで保存されます。このフォルダはGitに含めていないので、リポジトリを共有しても自分の登録内容は相手に渡りません。

## ライセンス

[LICENSE](LICENSE) を参照してください。
