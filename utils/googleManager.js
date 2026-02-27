const { TranslationServiceClient } = require('@google-cloud/translate');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');

// 1. Google Cloud yetkilendirmesi (JSON dosyanın proje kök dizininde olduğunu varsayıyoruz)
const projectId = 'file-translate-93ebe';
const keyFilename = path.join(__dirname, '../file-translate-93ebe-59170bb55fa4.json');

// Google Translation V3 İstemcisi
const translationClient = new TranslationServiceClient({
    projectId: projectId,
    keyFilename: keyFilename
});

class GoogleManager {
    /**
     * Dökümanı Google Cloud Translation API (V3) ile çevirir.
     */
    async translateDocument(fileBuffer, fileName, targetLang) {
        let tempInputPath = null;
        let tempOutputPath = null;

        try {
            // Google Cloud V3 API, dosyanın MIME tipini bilmek ister.
            const mimeType = this._getMimeType(fileName);

            // Google API, buffer'ı doğrudan base64 formatında alabilir. Geçici dosyaya gerek yok!
            const documentInputConfig = {
                content: fileBuffer.toString('base64'),
                mimeType: mimeType,
            };

            const request = {
                parent: `projects/${projectId}/locations/us-central1`, // Regional endpoint kullanmak daha güvenlidir
                documentInputConfig: documentInputConfig,
                targetLanguageCode: targetLang.toLowerCase(), // Google küçük harf bekleyebilir (ör: 'en', 'es')
            };

            console.log(`Google API Çeviri İsteği Gönderiliyor: ${fileName} -> ${targetLang}`);

            // API'ye istek at
            const [response] = await translationClient.translateDocument(request);

            // Dönen çevrilmiş dosyayı buffer olarak al
            const translatedBuffer = response.documentTranslation.byteStreamResult;

            return translatedBuffer;

        } catch (error) {
            console.error('Google Manager Error:', error);
            throw new Error('Google Çeviri işlemi sırasında hata oluştu: ' + error.message);
        }
    }

    /**
     * Dosya uzantısına göre MIME tipini belirler.
     */
    _getMimeType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case '.docx':
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case '.pptx':
                return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            case '.xlsx':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case '.html':
                return 'text/html';
            case '.txt':
                return 'text/plain';
            default:
                throw new Error(`Google API bu dosya formatını desteklemiyor: ${ext}`);
        }
    }
}

module.exports = new GoogleManager();
