const deepl = require('deepl-node');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

const authKey = "c88477fb-8ac4-46b0-a99b-1909033bebfe:fx";
const translator = new deepl.Translator(authKey);

class DeepLManager {
    async translateDocument(fileBuffer, fileName, targetLang) {
        let tempInputPath = null;
        let tempOutputPath = null;

        try {
            const tempDir = os.tmpdir();
            tempInputPath = path.join(tempDir, `input_${Date.now()}_${fileName}`);
            tempOutputPath = path.join(tempDir, `output_${Date.now()}_${fileName}`);

            await fs.writeFile(tempInputPath, fileBuffer);

            // Çeviri işlemini dene
            await translator.translateDocument(
                tempInputPath,
                tempOutputPath,
                null, // Source language (Auto-detect)
                targetLang
            );

            const translatedBuffer = await fs.readFile(tempOutputPath);
            return translatedBuffer;

        } catch (error) {
            // EĞER DİLLER AYNIYSA: Çeviri yapmadan orijinal buffer'ı dön
            if (error.message.includes("Source and target language are equal")) {
                console.warn("Kaynak ve hedef dil aynı, orijinal dosya gönderiliyor.");
                return fileBuffer;
            }

            console.error('DeepL Manager Error:', error);
            throw new Error('Çeviri işlemi sırasında hata oluştu: ' + error.message);
        } finally {
            // Dosyaları temizle
            if (tempInputPath) await fs.unlink(tempInputPath).catch(() => { });
            if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => { });
        }
    }
}

module.exports = new DeepLManager();