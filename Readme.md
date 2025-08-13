これは何？
===

Slackボットを第三者のワークスペースにインストールし、WebHookURLを指定しなくてもoAuth認証トークンを利用して通知を送るための検証用リポジトリです。

Slackの設定内容等については [こちら](https://junkbox.wicurio.com/index.php?Slack%E9%80%9A%E7%9F%A5%E9%80%A3%E6%90%BA%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E6%A4%9C%E8%A8%BC) の記事を参考にしてください。


## ディレクトリ構成

* backend
  * 主にインストール時のoAuthコールバック処理用バックエンドと、フロントエンドのAPIです。
  * oAuth認証トークンを使用し、限定された権限内でSlack APIを実行することができます。本検証コードでは取得した認証トークンでインストールされたワークスペース内の指定されたチャネルに対し通知を飛ばします。
* frontend
  * 検証用フロントエンド（React）です。Slackアプリをインストールし、oAuth認証を行った上で、インストールしたワークスペースの設定したチャネルに対しSlack通知を送ります。
  * 内部的には通知するプロジェクト単位で複数のワークスペース、チャネルに対し通知を送るように設計されていますが、本検証コードではプロジェクト名は「TESTPRJ」固定です。
  * バックエンドデプロイ完了後、`frontend/.env.sample` を `.env` にコピーし、`REACT_APP_API_BASE_URL` にAPI GatewayのURLを記載してください。
    例:
    ```env
    REACT_APP_API_BASE_URL=https://example.execute-api.ap-northeast-1.amazonaws.com/dev/
    ```
* frontend_vue
  * Vue3 + Vite版のフロントエンドです。
  * `frontend_vue/.env.sample` を `.env` にコピーし、`VITE_API_BASE_URL` にAPI GatewayのURLを記載してください。
    例:
    ```env
    VITE_API_BASE_URL=https://example.execute-api.ap-northeast-1.amazonaws.com/dev/
    ```
  * S3等へのデプロイ手順は `DOC/deploy_static_hosting.md` を参照してください。
* slackbot
  * Slackボットアプリの本体です。
  * oAuthトークンを取得することが目的なので、このアプリ自体は気の利いた応答もしないですし、何かコマンドを受け付けることもありません。
  * もちろんそのように実装しても構いませんが、本検証での動作には影響がないので実装していません。
* config
  * バックエンドデプロイ用シークレットファイル
  * 雛形ファイルを `secrets.yml` にリネームして値をセットしてください。
  * SLACK_STATE_SECRET は `openssl rand -base64 32` な感じでランダムな文字列をセットしてください。
