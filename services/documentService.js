const documentRepository = require('../repositories/documentRepository');

const userRepository = require('../repositories/userRepository');

const { uploadToBunny } = require('../utils/bunnyCDN');

const deepLManager = require('../utils/deepLManager');

const googleManager = require('../utils/googleManager'); 

const path = require('path');

const logger = require('../utils/logger');



class DocumentService {



    /**

     * Dosya adındaki bozuk encoding'i düzeltir, Türkçe karakterleri çevirir 

     * ve URL'de sorun yaratacak boşluk/özel karakterleri temizler.

     */

    _sanitizeFilename(fileName) {

        let decodedName = fileName;

        

        // 1. Multer'ın Latin1 bug'ını çözüp orijinal Türkçe karakterleri geri getiriyoruz

        try {

            decodedName = Buffer.from(fileName, 'latin1').toString('utf8');

        } catch (e) {

            console.error("Filename decode error:", e);

        }



        const trMap = {

            'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',

            'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',

            'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'

        };

        let cleanName = decodedName.replace(/[çÇğĞıİöÖşŞüÜ]/g, match => trMap[match]);

        

        // 3. Sadece harf, rakam, nokta ve tireye izin ver, geri kalanları alt çizgi (_) yap

        cleanName = cleanName.replace(/[^a-zA-Z0-9.\-]/g, '_');

        return cleanName;

    }
     async analyzeAndUpload(userId, file, targetLang = 'TR') {

        // 1. Kullanıcı ve Limit Kontrolü

        const user = await userRepository.findById(userId);

        if (!user) throw new Error('Kullanıcı bulunamadı.');



        if (!user.is_premium) {

            const totalCount = await documentRepository.getTotalCountByUserId(userId);

            if (totalCount >= 1) {

                throw new Error('LIMIT_EXCEEDED: Ücretsiz deneme hakkınız doldu.');

            }

        }



        // KRİTİK DÜZELTME: Dosya adını temizle

        const cleanOriginalName = this._sanitizeFilename(file.originalname);


        logger.info(`Çeviri Başlıyor: User: ${userId}, File: ${cleanOriginalName}, Target: ${targetLang}`);



        // 2. DOSYA UZANTISINI KONTROL ET VE İLGİLİ API'YE YÖNLENDİR

        const fileExt = path.extname(cleanOriginalName).toLowerCase().trim();

        let translatedBuffer;

        let providerUsed = ''; 



//        if (fileExt === '.pdf' || fileExt.includes('pdf')) {

  //          providerUsed = 'DeepL';

    //        logger.info('PDF algılandı, DeepL API kullanılıyor.');

//            translatedBuffer = await deepLManager.translateDocument(

  //              file.buffer,

    //            cleanOriginalName, // Temiz ismi gönderiyoruz

      //          targetLang

        //    );

      //  } else {
                     providerUsed = 'Google Cloud';

            logger.info(`${fileExt} algılandı, Google Cloud Translation API kullanılıyor.`);

            translatedBuffer = await googleManager.translateDocument(

                file.buffer,

                cleanOriginalName, // Temiz ismi gönderiyoruz

                targetLang

            );

      //  }

        // 3. Çevrilmiş dosyayı BunnyCDN'e yükle (Temizlenmiş isimle)

        const translatedFileName = `translated_${targetLang}_${cleanOriginalName}`;

        const translatedUrl = await uploadToBunny(translatedBuffer, translatedFileName);
         
        // 4. Veritabanına kaydet 

        const newDoc = await documentRepository.create({

            user_id: userId,

            doc_name: translatedFileName,

            doc_path: translatedUrl,

            analysis_summary: `Çeviri yapıldı: ${targetLang} (API: ${providerUsed})`

        });



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
