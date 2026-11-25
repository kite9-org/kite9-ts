function pointIntersect(v: number, min: number, max: number): boolean {
  return min <= v && max >= v;
}

export const Tools = {
  contains(amin: number, amax: number, bmin: number, bmax: number): boolean {
    return pointIntersect(amin, bmin, bmax) && pointIntersect(amax, bmin, bmax);
  },
};
