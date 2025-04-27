ALTER TABLE books
RENAME TO dirty_books;


CREATE TABLE clean_books (
    book_id SERIAL PRIMARY KEY,
    isbn13 VARCHAR(13),
    author VARCHAR(255),
    original_publication_year INT,
    original_title VARCHAR(255),
    title VARCHAR(255),
    average_rating DECIMAL(3, 2),
    ratings_count INT,
    ratings_1 INT,
    ratings_2 INT,
    ratings_3 INT,
    ratings_4 INT,
    ratings_5 INT,
    image_url TEXT,
    small_image_url TEXT
);

SELECT *
FROM clean_books;

CREATE TABLE books (
	isbn13 VARCHAR(13) PRIMARY KEY,
	original_publication_year INT,
	original_title VARCHAR(255),
    title VARCHAR(255) NOT NULL,
	image_url TEXT,
    small_image_url TEXT
);

CREATE TABLE authors (
	author_id SERIAL PRIMARY KEY,
	author VARCHAR(255) NOT NULL
);

CREATE TABLE author_books (
	author_id INT REFERENCES authors (author_id) ON DELETE CASCADE,
	isbn13 VARCHAR(13) REFERENCES books (isbn13) ON DELETE CASCADE,
	PRIMARY KEY (author_id, isbn13)
);

CREATE TABLE book_ratings (
	isbn13 VARCHAR(13) REFERENCES books (isbn13) ON DELETE CASCADE,
	ratings_1 INT,
    ratings_2 INT,
    ratings_3 INT,
    ratings_4 INT,
    ratings_5 INT,
	PRIMARY KEY (isbn13)
);

INSERT INTO books (isbn13, original_publication_year, original_title, title, image_url, small_image_url)
SELECT DISTINCT
    isbn13,
    original_publication_year,
    original_title,
    title,
    image_url,
    small_image_url
FROM clean_books;

SELECT *
FROM books;

INSERT INTO authors (author)
SELECT DISTINCT
    author
FROM clean_books;

SELECT *
FROM authors;

INSERT INTO author_books (author_id, isbn13)
SELECT DISTINCT a.author_id, cb.isbn13
FROM clean_books cb
JOIN authors a ON cb.author = a.author;

SELECT *
FROM author_books;

INSERT INTO book_ratings (isbn13, ratings_1, ratings_2, ratings_3, ratings_4, ratings_5)
SELECT DISTINCT
    isbn13,
    ratings_1,
    ratings_2,
    ratings_3,
    ratings_4,
    ratings_5
FROM clean_books;

SELECT *
FROM book_ratings;












