export class DateValidate {
  static isLastDayOfWeek = () => {
    const today = new Date();
    const isLastDayOfWeek = today.getDay() === 6;

    return isLastDayOfWeek;
  };

  static isLastDayOfLastWeekOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const lastDayOfMonth = new Date(year, month + 1, 0);

    if (date.getDate() === lastDayOfMonth.getDate()) {
      return date.getDay() === 0;
    }

    return false;
  };
}
