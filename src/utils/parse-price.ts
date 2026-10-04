export class ParsePrice {
    public static parse(priceString: string): number {

        const cleanedString = priceString.replace(/[^0-9.]/g, '');
        const price = parseFloat(cleanedString);
        if (isNaN(price)) {
            throw new Error(`No se pudo convertir la cadena de precio "${priceString}" a un número.`);
        }
        return price;
    }
}
