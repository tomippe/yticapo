#!/bin/bash
set -e

# ===== yticapo ビルドスクリプト =====

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="yticapo"
DEPLOY_DIR="../apps.tomippe.jp/yticapo"

# 共通スクリプト読み込み
source "$SCRIPT_DIR/../build-common/version.sh"
source "$SCRIPT_DIR/../build-common/ftp-upload.sh"

# バージョン読み込み
VERSION=$(version_read)

# package.json / manifest.json のバージョンを更新
if [ -f "package.json" ]; then
    jq ".version = \"${VERSION}\"" package.json > package.json.tmp && mv package.json.tmp package.json
    echo "  ✓ package.jsonのバージョンを v${VERSION} に更新しました"
fi

if [ -f "manifest.json" ]; then
    jq ".version = \"${VERSION}\"" manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
    echo "  ✓ manifest.jsonのバージョンを更新しました"
fi

echo "🔍 ${APP_NAME} v${VERSION} をビルド中..."

# デプロイ先のクリーンアップ
echo "🧹 デプロイ先をクリーンアップしています..."
if [ -d "$DEPLOY_DIR" ]; then
    find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.gitignore' -exec rm -rf {} +
    echo "  ✓ ${DEPLOY_DIR}/の中身を削除しました（.git関連は保護）"
else
    mkdir -p "$DEPLOY_DIR"
    echo "  ✓ ${DEPLOY_DIR}/ディレクトリを作成しました"
fi

# ファイルコピー
echo "📂 ファイルをコピーしています..."
cp index.html "$DEPLOY_DIR/"
cp style.css "$DEPLOY_DIR/"
cp script.js "$DEPLOY_DIR/"
cp sw.js "$DEPLOY_DIR/"
cp manifest.json "$DEPLOY_DIR/"
echo "  ✓ 主要ファイルをコピーしました"

# アイコンファイルをコピー
for icon in favicon.png apple-touch-icon.png; do
    if [ -f "$icon" ]; then
        cp "$icon" "$DEPLOY_DIR/"
        echo "  ✓ ${icon}をコピーしました"
    else
        echo "  ⚠️  ${icon} が見つかりません"
    fi
done

# .htaccessがある場合はコピー
if [ -f ".htaccess" ]; then
    cp .htaccess "$DEPLOY_DIR/"
    echo "  ✓ .htaccessをコピーしました"
fi

echo "✅ ビルドが完了しました！"

# FTPアップロード
ftp_upload_dir "$DEPLOY_DIR" "yticapo"

# 次回用バージョン保存
echo ""
echo "📝 次回用バージョンを更新しています..."
version_save_next "$VERSION"

echo ""
echo "🎉 ${APP_NAME} v${VERSION} — すべて完了しました！"
