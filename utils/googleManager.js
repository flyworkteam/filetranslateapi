const { TranslationServiceClient } = require('@google-cloud/translate');
const path = require('path');

// 1. Google Cloud yetkilendirmesi
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
        try {
            // Dosyanın MIME tipini alıyoruz (Artık PDF de destekli)
            const mimeType = this._getMimeType(fileName);

            const documentInputConfig = {
                content: fileBuffer, 
                mimeType: mimeType,
            };

            const request = {
                parent: `projects/${projectId}/locations/us-central1`, 
                documentInputConfig: documentInputConfig,
                targetLanguageCode: targetLang.toLowerCase(), 
            };

            console.log(`Google API Çeviri İsteği Gönderiliyor: ${fileName} -> ${targetLang} (MIME: ${mimeType})`);

            // API'ye istek at
            const [response] = await translationClient.translateDocument(request);

            // Google veriyi 'byteStreamOutputs' adında bir DİZİ (Array) olarak döndürür!
            if (
                response.documentTranslation && 
                response.documentTranslation.byteStreamOutputs && 
                response.documentTranslation.byteStreamOutputs.length > 0
            ) {
                // Dizinin ilk elemanını Buffer olarak alıyoruz
                const translatedBuffer = Buffer.from(response.documentTranslation.byteStreamOutputs[0]);
                return translatedBuffer;
            } else {
                console.error("Beklenmeyen Google Yanıtı:", JSON.stringify(response, null, 2));
                throw new Error("Google API çevrilmiş dosya verisini döndürmedi.");
            }

        } catch (error) {
            console.error('Google Manager Error:', error);
            throw new Error('Google Çeviri işlemi sırasında hata oluştu: ' + error.message);
        }
    }


    /**
     * Dosya uzantısına göre MIME tipini belirler. Görünmez boşlukları temizler.
     */
    _getMimeType(fileName) {
        const ext = path.extname(fileName).toLowerCase().trim();
        
        switch (ext) {
            case '.pdf':
                return 'application/pdf'; // Hata durumunda Google'a düşerse patlamasın diye eklendi
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
