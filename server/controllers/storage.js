const http = require('http');
const config = require('config');
const formdata = require('form-data');
const to = require('await-to-js').default;

const Company = require('@models/company');
const Student = require('@models/student');
const File = require('@models/file');

const uploadFile = async function(token, file, cb) {
    if (!cb) {
        throw new Error('callback function must be defined');
    }

    // formdata которая будет отправлена на сервер
    var form = new formdata();

    form.append('file', file.data, {
        filename: file.name,
    });

    // Хедеры html запроса, включают в себя инфо о файле и токен для авторизации
    var headers = form.getHeaders();
    headers.authorization = token;

    // Сам http запрос
    var request = http.request({
        method: 'put',
        host: config.FILE_SERVER_HOST,
        port: config.FILE_SERVER_PORT,
        path: '/store/media',
        headers,
    });

    // Отправляем файл
    form.pipe(request);

    request.on('error', (err) => {
        cb(err);
    });

    // Ответ на запрос присылается кусками
    // Присоединяем все куски к строке, а затем парсим в json
    var rawData = "";
    request.on('response', async (response) => {
        response.on('data', async function(data) {
            rawData += data;
        });
        response.on('end', async () => {
            // Парсим в json
            try {
                const jsonData = JSON.parse(rawData);
                cb(null, {
                    statusCode: response.statusCode,
                    message: jsonData,
                });
            } catch (error) {
                // Если не смогли спарсить, то скорее всего ответ пришел в html
                // Возвращаем в том же виде
                cb(null, {
                    statusCode: response.statusCode,
                    message: rawData,
                });
            }
        });
    });
}

// Функции связанные с сохранением файлов
module.exports = {
    // middleware функция устанавливает лимит на размеры файлов
    limitFileSize: (size) => {
        return (req, res, next) => {
            if (!req.files) {
                next();
            }

            // Проверка на размер файлов
            for (var [fileKey, file] of Object.entries(req.files)) {
                if (file.data.length > size) {
                    return res.status(400).json({
                        error: `file size limit is ${size}`
                    });
                }
            }

            next();
        };
    },

    // Функция отправляет принятые файлы на файловый сервер, добавляет информацию
    // о файле в базу данных и отправляет инфо обратно
    // Адрес сервера находится в файлах конфигурации
    uploadDocument: (userType) => {
        return async (req, res, next) => {
            // Проверяем, что файл был выслан
            if (!req.files || !req.files.file) {
                return res.status(400).json({
                    error: 'file not received'
                });
            }
            var file = req.files.file;

            uploadFile(req.headers.authorization, file, async (uploadError, response) => {
                if (uploadError) {
                    return res.status(500).send(uploadError.message);
                }

                if (response.statusCode !== 200) {
                    return res.status(response.statusCode).send(response.message);
                }

                var [err, newFile] = await to(
                    new File({
                        ownerType: userType,
                        ownerId: req.user.id,
                        fileInfo: {
                            link: response.message.link,
                            fileName: response.message.fileName,
                            mimeType: response.message.mimeType,
                            fileType: 'document',
                        }
                    }).save()
                );
                if (err) {
                    return res.status(500).send(err.message);
                }

                return res.status(200).send(newFile);
            });
        }
    },

    getDocuments: (userType) => {
        return async (req, res, next) => {
            const [err, files] = await to(
                File.find({
                    'ownerType': userType,
                    'ownerId': req.user.id,
                    'fileInfo.fileType': 'document',
                })
            );
            if (err) {
                return res.status(500).send(err.message);
            }

            return res.status(200).json({
                files,
            });
        }
    },

    removeDocument: async (req, res, next) => {
        const [err] = await to(
            File.findByIdAndRemove(req.params.id)
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).send('ok');
    }
};
