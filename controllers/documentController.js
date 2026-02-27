const documentService = require('../services/documentService');
const logger = require('../utils/logger');

class DocumentController {

    /**
     * Dosyayı alır, DeepL ile çevirir ve BunnyCDN'e yükler.
     */
    async uploadDocument(req, res) {
        try {
            // Form-data'dan gelen veriler
            const userId = req.body.userId;
            const targetLang = req.body.targetLang || 'TR'; // Varsayılan olarak TR
            const file = req.file;

            // Validasyonlar
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID gerekli.'
                });
            }

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'Dosya yüklenmedi.'
                });
            }

            // Dosya formatı kontrolü (DeepL'in desteklediği formatlar)
            const allowedExtensions = ['.docx', '.pptx', '.xlsx', '.pdf', '.txt', '.html'];
            const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

            if (!allowedExtensions.includes(fileExt)) {
                return res.status(400).json({
                    success: false,
                    message: `Desteklenmeyen dosya formatı. Desteklenenler: ${allowedExtensions.join(', ')}`
                });
            }

            // Servise gönder (Artık n8n yerine direkt DeepL işleyecek)
            const result = await documentService.analyzeAndUpload(userId, file, targetLang);

            return res.status(200).json({
                success: true,
                message: result.message || 'Çeviri ve yükleme işlemi başarılı',
                data: result.data
            });

        } catch (error) {
            logger.error(`Document Upload Error (User: ${req.body.userId}):`, error.message);

            // Limit aşımı kontrolü
            if (error.message.includes('LIMIT_EXCEEDED')) {
                return res.status(403).json({
                    success: false,
                    message: 'Günlük ücretsiz çeviri limitinize ulaştınız.',
                    data: 'PREMIUM_REQUIRED'
                });
            }

            // DeepL API spesifik hataları veya genel sunucu hataları
            res.status(500).json({
                success: false,
                message: 'Çeviri işlemi sırasında bir hata oluştu.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Kullanıcının geçmiş dökümanlarını listeler.
     */
    async getUserDocuments(req, res) {
        try {
            const userId = req.params.userId || req.body.userId;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID gerekli.'
                });
            }

            const documents = await documentService.getUserDocuments(userId);

            return res.status(200).json({
                success: true,
                message: 'Dökümanlar başarıyla getirildi.',
                data: documents
            });

        } catch (error) {
            logger.error(`Get Documents Error:`, error.message);
            return res.status(500).json({
                success: false,
                message: 'Dökümanlar listelenirken bir hata oluştu.'
            });
        }
    }
}

module.exports = new DocumentController();