export class DateValidate {
  static isLastDayOfWeek = () => {
    const today = new Date();
    const isLastDayOfWeek = today.getDay() === 0;

    return isLastDayOfWeek;
  };

  static isLastDayOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const lastDayOfMonth = new Date(year, month + 1, 0);

    return today.getDate() === lastDayOfMonth.getDate();
  };
}
