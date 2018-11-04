const mongoose = require('mongoose');
const config = require('config');

const credentialsSchema = require('@models/schemas/credentials');

// Students DB
// Student can log in via email, google or [facebook(currently not working)].
// TODO(zhanadil): Add FB registration
// All the information including phone number, photo and user description
// are stored there.
const studentSchema = mongoose.Schema({
    credentials: credentialsSchema,
    userType: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    firstName: String,
    lastName: String,
    phone: String,
    description: String,
    belbinResults: [{
        categoryName: String,
        pointsNumber: Number,
        pointsPercentage: Number,
    }],
    rating: {
        // Оценки компаний за выполненные работы
        companyReviews: [{
            task: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'task',
            },
            application: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'application'
            },
            points: Number
        }],
        // Публичный рейтинг фрилансера. r ∈ [0; 5]
        publicRating: {
            type: Number,
            default: 0,
        },
        // Скрытый рейтинг, по которому происходит сортировка. r ∈ [0; 100]
        hiddenRating: {
            type: Number,
            default: 0,
        },
    },
});

// Считает скрытый рейтинг фрилансера по всем его оценкам.
// берет все его оценки от 0 до 5 и возвращает его рейтинг по 100 бальной шкале.
// Кол-во оценок влияет на рейтинг, к примеру 1 оценка в 5 баллов может быть ниже
// чем 10 оценок в 4 балла.
// Формула взята из: https://math.stackexchange.com/a/942965
studentSchema.methods.HiddenRating = function HiddenRating() {
    // Среднее число всех оценок
    let meanAverage = this.PublicRating();

    // "Вес" кол-ва оценок
    // TL;DR: чем больше кол-во оценок, тем больше это число.
    //
    // Используем экспоненциальную функцию, чтобы уменьшить изменение рейтинга
    // с каждой последующей оценкой.
    // Другими словами, разница между одной и двумя оценками коллосальна,
    // а разница между 100 и 101 оценками незначительна.
    // Результат w ∈ [0; 1)
    let quantityWeight =
        1 - Math.exp(-this.rating.companyReviews.length / config.get('MODERATE_NUMBER_OF_REVIEWS'));

    // "Склонность оценки" отвечает на вопрос, что больше влияет на финальный рейтинг
    // среднее число оценок или их кол-во.
    // Если эта шкала равна 0.5, то кол-во и качество оценок одинаково равны
    // Чем ближе число к 0, тем важнее среднее оценок.
    // Чем ближе число к 1, тем важнее кол-во.
    const ratingScale = config.get('RATING_MEAN_VS_QUANTITY_BIAS');

    // Среднее оценок - это число от 0 до 5, так как "вес" кол-ва не превышает 1
    // Мы должны умножить его на 5, чтобы сравнять их:
    // meanAverage + 5*quantityWeight
    //
    // После этого, мы умножаем их на коэффициент склонности оценки, и получаем оценка от 0 до 5:
    // ratingScale * meanAverage + (1-ratingScale)*5*quantityWeight
    //
    // Дальше, чтобы получить число от 0 до 100 мы умножаем результат на 20
    return 20*(ratingScale*meanAverage + 5*(1-ratingScale)*quantityWeight);
}

// Публичный рейтинг фрилансера - это среднее число всех оценок
studentSchema.methods.PublicRating = function PublicRating() {
    let meanAverage = 0;
    this.rating.companyReviews.forEach((rating) => {
        meanAverage += rating.points;
    });
    meanAverage /= this.rating.companyReviews.length;

    return meanAverage;
}

studentSchema.pre('save', function() {
    this.rating.publicRating = this.PublicRating();
    this.rating.hiddenRating = this.HiddenRating();
});

module.exports = studentSchema;
