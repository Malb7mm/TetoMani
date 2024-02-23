// https://qiita.com/go6887/items/dcb7aa86ba6a006d4746

export const authorize = (to: any, from: any, next: any) => {
  const queryKey = 'redirect_path';
  if (to.query[queryKey]) {
    next({
      path: `/${to.query[queryKey]}`,
    });
  } else {
    next();
  }
};
