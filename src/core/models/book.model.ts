import { IRatings } from './ratings.model';
import { IUrlIcon } from './urlIcon.model';

export interface IBook {
    isbn13: number;
    authors: string;
    publication: number;
    original_title: string;
    title: string;
    ratings: IRatings;
    icons: IUrlIcon;
}

// Kept the old interface until it gets reformated into the new one.
export interface IBookLegacy {
    isbn13: string;
    authors: string;
    original_publication_year: number;
    original_title: string;
    title: string;
    average_rating: number;
    ratings_count: number;
    ratings_1: number;
    ratings_2: number;
    ratings_3: number;
    ratings_4: number;
    ratings_5: number;
    image_url: string;
    small_image_url: string;
}

// Helper function to convert from legacy format to new format
export function convertLegacyBookToNew(book: IBookLegacy): IBook {
    return {
        isbn13: parseInt(book.isbn13),
        authors: book.authors,
        publication: book.original_publication_year,
        original_title: book.original_title,
        title: book.title,
        ratings: {
            average: book.average_rating,
            count: book.ratings_count,
            rating_1: book.ratings_1,
            rating_2: book.ratings_2,
            rating_3: book.ratings_3,
            rating_4: book.ratings_4,
            rating_5: book.ratings_5
        },
        icons: {
            large: book.image_url,
            small: book.small_image_url
        }
    };
}

// Helper function to convert from new format to legacy format
export function convertNewBookToLegacy(book: IBook): IBookLegacy {
    return {
        isbn13: book.isbn13.toString(),
        authors: book.authors,
        original_publication_year: book.publication,
        original_title: book.original_title,
        title: book.title,
        average_rating: book.ratings.average,
        ratings_count: book.ratings.count,
        ratings_1: book.ratings.rating_1,
        ratings_2: book.ratings.rating_2,
        ratings_3: book.ratings.rating_3,
        ratings_4: book.ratings.rating_4,
        ratings_5: book.ratings.rating_5,
        image_url: book.icons.large,
        small_image_url: book.icons.small
    };
}