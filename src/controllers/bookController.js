const BookModel = require('../models/bookModel.js');
const ReviewModel = require("../models/reviewModel.js")
const UserModel = require("../models/userModel.js");
const {uploadFile}=require("../aws/aws.js")

const { isValidObjectId, objectValue, forBody, isbnIsValid, nameRegex, titleRegex, dateFormate } = require('../validators/validation.js');


//===================================================[API:FOR CREATING BOOK DB]===========================================================

const createBooks = async (req, res) => {
  try{
        let files=req.files;
        const filedAllowed = ["title", "excerpt", "userId", "ISBN", "category", "subcategory", "releasedAt"];
const { title, excerpt, userId, ISBN, category, subcategory, reviews, isDeleted,releasedAt}=req.body
        if (!forBody(req.body))
            return res.status(400).send({ status: false, message: "Body should not remain empty" });

        const keyOf = Object.keys(req.body);
        const receivedKey = filedAllowed.filter((x) => !keyOf.includes(x));
        if (receivedKey.length) {
            return res.status(400).send({ status: false, msg: `${receivedKey} field is missing` });
        }
        
        if(files && files.length>0){
            var url=await uploadFile(files[0]);
           
        }
        else{
            res.status(400).send("NO FILES FOUND");
        }
        //  var { title, excerpt, userId, ISBN, category, subcategory, reviews, isDeleted, releasedAt,bookCover:url} = req.body;
// const data={
//     title,excerpt,userId,ISBN,category,subcategory,isDeleted,releasedAt:Date.now(),bookCover:url};


        const check_title = await BookModel.findOne({ title: title });

        if (check_title)
            return res.status(400).send({ status: false, message: "Title is already taken please provide different title" });

        if (!objectValue(title))
            return res.status(400).send({ status: false, message: "Title must be present" });

        if (!titleRegex(title))
            return res.status(400).send({ status: false, message: "Please provide valid title, it should not contains any special characters and numbers" });

        if (!objectValue(excerpt))
            return res.status(400).send({ status: false, message: "Excerpt cannot remains empty" });

        if (!nameRegex(excerpt))
            return res.status(400).send({ status: false, message: "Please provide valid excerpt, it should not contains any special characters and numbers" });


        if (!isValidObjectId(userId))
            return res.status(400).send({ status: false, message: "Please provide valid userId" });


        if (!objectValue(userId))
            return res.status(400).send({ status: false, message: "UserId must be present it cannot remain empty" });
        let userLoggedIn = req.bookIdNew
        let usersId = req.body.userId
        if (userLoggedIn != usersId) return res.status(403).send({ status: false, msg: 'User logged is not allowed to modify the requested users data' })
        if (!objectValue(category))
            return res.status(400).send({ status: false, message: "Category cannot remains empty" });

        const check_isbn = await BookModel.findOne({ ISBN: req.body.ISBN });

        if (check_isbn)
            return res.status(400).send({ status: false, message: "ISBN is already taken please provide different ISBN number" });

        if (!isbnIsValid(ISBN))
            return res.status(400).send({ status: false, message: "ISBN must be present" });

        if (!objectValue(releasedAt))
            return res.status(400).send({ status: false, message: "ReleasedAt cannot remains empty" });

        if (!dateFormate(releasedAt))
            return res.status(400).send({ status: false, message: "ReleasedAt is not in a correct formate" });

        if (subcategory) {
            for (let i = 0; i < subcategory.length; i++) {
                if (!objectValue(subcategory[i]))
                    return res.status(400).send({ status: false, message: "subcategory cannot remains empty" });
            }
        }

        if (subcategory.length == 0)
            return res.status(400).send({ status: false, message: "subCategory cannot be  empty array" });

        if (isDeleted === " ") {
            if (!objectValue(isDeleted))
                return res.status(400).send({ status: false, message: "isDeleted must be present" });
        }

        const data={
            title,excerpt,userId,ISBN,category,subcategory,isDeleted,releasedAt:Date.now(),bookCover:url};
        
        const savedData = await BookModel.create(data);

        const finalData = await BookModel.findById(savedData._id).select({ __v: 0, createdAt: 0, updatedAt: 0 });
        
        return res.status(201).send({status:true,msg:"Successful",data:finalData})
    }catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }

}

//===================================================[API:FOR GETTING LIST OF ALL BOOKS]===========================================================

const getBookDetails = async (req, res) => {
    try {
        const { userId, category, subcategory } = req.query;
        const filter = { isdeleted: false }
        if (Object.keys(req.query).length !== 0) {

           

            filter['$or'] = [
                { userId: req.query.userId },
                { category: req.query.category },
                { subcategory: req.query.subcategory },
            ];
            if (userId)
                if (!isValidObjectId(userId))
                    return res.status(404).send({ status: false, message: "Please provide valid userId" });


            const findData = await BookModel.find(filter).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })

            if (!findData.length) {
                return res.status(404).send({ status: false, message: "No data found for books" })
            }
            let sortbook = findData.sort((a, b) => (a['title'] || "").toString().localeCompare((b['title'] || "").toString()));

            res.status(200).send({ status: true, message: 'Book list', data: sortbook })
        } else {

            const findData = await BookModel.find({ isDeleted: false }).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
            let sortbook = findData.sort((a, b) => (a['title'] || "").toString().localeCompare((b['title'] || "").toString()));
            return res.status(200).send({ status: true, message: "booklist", data: sortbook })

        }
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}


//===================================================[API:FOR GETTING LIST OF ALL BOOKS BY BOOK ID]===========================================================


const getBooksById = async function (req, res) {
    try {
        const bookId = req.params.bookId;

        if (!isValidObjectId(bookId))
            return res.status(400).send({ status: false, message: "Please provide valid bookId" });


        let bookIdCheck = await BookModel.findOne({ _id: bookId, isDeleted: false });

        if (!bookIdCheck)
            return res.status(404).send({ status: false, message: "no book present from this BOOKID" });


        let { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt, createdAt, updatedAt } = bookIdCheck;

        let Reviews = await ReviewModel.find({ bookId: bookIdCheck._id, isDeleted: false }).select({ isDeleted: 0, createdAt: 0, updatedAt: 0, __v: 0 })

        let getData = { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt, createdAt, updatedAt, reviewsData: Reviews }
        return res.status(200).send({ status: true, message: "Books list", data: getData })
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }

}

//===================================================[API:FOR UPDATE BOOK]===========================================================


const updateBook = async (req, res) => {
    try {
        const { title, excerpt, releaseAt, ISBN } = req.body;
        const bookId = req.params.bookId

        let filter = { _id: bookId, isDeleted: false }
        if (Object.keys(req.body).length != 0) {
            const findBook = await BookModel.findOne(filter);
            if (!findBook)
                return res.status(404).send({ status: false, message: "No book data is found" });


            const check_title = await BookModel.findOne({ title: title })
            if (check_title)
                return res.status(400).send({ status: false, message: "Title is already in use please give a different title to update" });

            if (!objectValue(title))
                return res.status(400).send({ status: false, message: "Title must be present" });

            if (!nameRegex(title))
                return res.status(400).send({ status: false, message: "Please provide valid title, it should not contains any special characters and numbers" });

            if (!objectValue(excerpt))
                return res.status(400).send({ status: false, message: "Excerpt must be present" });

            if (!nameRegex(excerpt))
                return res.status(400).send({ status: false, message: "Please provide valid excerpt, it should not contains any special characters and numbers" });

            if (!dateFormate(releaseAt))
                return res.status(400).send({ status: false, message: "ReleaseAt is not in a proper format" });

            if (!objectValue(releaseAt))
                return res.status(400).send({ status: false, message: "ReleaseAt must be present" });


            const check_isbn = await BookModel.findOne({ ISBN: req.body.ISBN });
            if (check_isbn)
                return res.status(400).send({ status: false, message: "ISBN is already taken please provide different ISBN number to update" });

            if (!objectValue(ISBN))
                return res.status(400).send({ status: false, message: "ISBN must be present" });

            if (!isbnIsValid(ISBN))
                return res.status(400).send({ status: false, message: "Invalid ISBN" });


            const updated = await BookModel.findOneAndUpdate({ _id: bookId }, req.body, { new: true });

            res.status(200).send({ status: true, message: 'Success', data: updated })
        } else {
            return res.status(400).send({ status: false, message: "Request body cannot remain empty" });
        }
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}


//===================================================[API:FOR DELETE BOOKS BY BOOK ID]===========================================================

const deleteById = async (req, res) => {
    try {

        const bookId = req.params.bookId
        let filter = { _id: bookId, isDeleted: false }

        const findBook = await BookModel.findOne(filter)
        if (!findBook)
            return res.status(404).send({ status: false, message: "This book is not found or deleted." });

        findBook.isDeleted = true;
        findBook.deletedAt = Date();

        const deletedBooKs = await BookModel.findByIdAndUpdate({ _id: bookId }, findBook, { new: true });
        res.status(200).send({ status: true, message: 'Success', data: "BookId is successfully deleted" });
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}



module.exports.createBooks = createBooks;
module.exports.getBookDetails = getBookDetails;
module.exports.getBooksById = getBooksById;
module.exports.updateBook = updateBook;
module.exports.deleteById = deleteById;