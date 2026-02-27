const documentRepository = require('../repositories/documentRepository');
const userRepository = require('../repositories/userRepository');
const { uploadToBunny } = require('../utils/bunnyCDN');
const deepLManager = require('../utils/deepLManager');
const logger = require('../utils/logger');

class DocumentService {
    async analyzeAndUpload(userId, file, targetLang = 'TR') {
        // 1. Kullanıcı ve Limit Kontrolü
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('Kullanıcı bulunamadı.');

        // if (!user.is_premium) {
        //     const weeklyCount = await documentRepository.getWeeklyCountByUserId(userId);
        //     if (weeklyCount >= 1) {
        //         throw new Error('LIMIT_EXCEEDED: Günlük çeviri limitiniz doldu.');
        //     }
        // }

        logger.info(`Çeviri Başlıyor: User: ${userId}, File: ${file.originalname}, Target: ${targetLang}`);

        // 2. DeepL ile Çeviri Yap (Dosya aynı formatta buffer döner)
        const translatedBuffer = await deepLManager.translateDocument(
            file.buffer,
            file.originalname,
            targetLang
        );

        // 3. Çevrilmiş dosyayı BunnyCDN'e yükle
        const translatedFileName = `translated_${targetLang}_${file.originalname}`;
        const translatedUrl = await uploadToBunny(translatedBuffer, translatedFileName);

        // 4. Veritabanına kaydet
        const newDoc = await documentRepository.create({
            user_id: userId,
            doc_name: translatedFileName,
            doc_path: translatedUrl,
            analysis_summary: `Çeviri yapıldı: ${targetLang}`
        });

        return {
            success: true,
            message: 'Çeviri başarıyla tamamlandı.',
            data: {
                id: newDoc.id,
                doc_name: newDoc.doc_name,
                url: translatedUrl
            }
        };
    }
}

module.exports = new DocumentService();