const documentRepository = require('../repositories/documentRepository');
const userRepository = require('../repositories/userRepository');
const { uploadToBunny } = require('../utils/bunnyCDN');
const deepLManager = require('../utils/deepLManager');
const googleManager = require('../utils/googleManager'); // Yeni Google Manager'ı dahil et
const path = require('path');
const logger = require('../utils/logger');

class DocumentService {
    async analyzeAndUpload(userId, file, targetLang = 'TR') {
        // 1. Kullanıcı ve Limit Kontrolü
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('Kullanıcı bulunamadı.');

        logger.info(`Çeviri Başlıyor: User: ${userId}, File: ${file.originalname}, Target: ${targetLang}`);

        // 2. DOSYA UZANTISINI KONTROL ET VE İLGİLİ API'YE YÖNLENDİR
        const fileExt = path.extname(file.originalname).toLowerCase();
        let translatedBuffer;
        let providerUsed = ''; // Hangi API'nin kullanıldığını DB'ye kaydetmek için

        if (fileExt === '.pdf') {
            // PDF ise DeepL'e gönder
            providerUsed = 'DeepL';
            logger.info('PDF algılandı, DeepL API kullanılıyor.');
            translatedBuffer = await deepLManager.translateDocument(
                file.buffer,
                file.originalname,
                targetLang
            );
        } else {
            // Diğer formatlar (docx, pptx, xlsx vb.) Google Cloud'a gönder
            providerUsed = 'Google Cloud';
            logger.info(`${fileExt} algılandı, Google Cloud Translation API kullanılıyor.`);
            translatedBuffer = await googleManager.translateDocument(
                file.buffer,
                file.originalname,
                targetLang
            );
        }

        // 3. Çevrilmiş dosyayı BunnyCDN'e yükle
        const translatedFileName = `translated_${targetLang}_${file.originalname}`;
        const translatedUrl = await uploadToBunny(translatedBuffer, translatedFileName);

        // 4. Veritabanına kaydet (Hangi API'nin kullanıldığını özet kısmına ekledik)
        const newDoc = await documentRepository.create({
            user_id: userId,
            doc_name: translatedFileName,
            doc_path: translatedUrl,
            analysis_summary: `Çeviri yapıldı: ${targetLang} (API: ${providerUsed})`
        });

        // 5. Flutter tarafındaki "null" hatasını engellemek için doc_path döndürüyoruz
        return {
            success: true,
            message: 'Çeviri başarıyla tamamlandı.',
            data: {
                id: newDoc.id,
                doc_name: newDoc.doc_name || translatedFileName,
                doc_path: newDoc.doc_path || translatedUrl,
                url: translatedUrl,
                analysis_summary: newDoc.analysis_summary
            }
        };
    }
}

module.exports = new DocumentService();
