# Pokemon-Stats-Finder
### Install
```bash
npm install @unsupo/stats-finder
```
### Import
```javascript
const StatFinder = require("@unsupo/stats-finder").StatFinder;
```

Use this code to help determine the evs and ivs as well as the nature
for a particular pokemon.

Pass in the base stats and the current stats and it'll do the rest

I haven't seen any others that will guess nature as well.

This won't always give 100% accurate results, but it will make the stats match 
### No Nature Given
```javascript
console.log(
    new StatFinder(100,[100,50,80,60,80,50],[343,162,251,175,210,148])
        .calculate()
);
# RETURNS
{
  ivs: [ 31, 31, 31, 31, 31, 31 ],
  evs: [ 8, 176, 129, 76, 56, 48 ],
  natures: [ 1, 0.9, 1.1, 1, 1, 1 ],
  natureName: 'bold'
}
```
### With Nature given
```javascript
console.log(
    new StatFinder(100,[100,50,80,60,80,50],[343,162,251,175,210,148],"bold")
        .calculate()
);
# RETURNS
{
  ivs: [ 31, 31, 31, 31, 31, 31 ],
  evs: [ 8, 176, 129, 76, 56, 48 ],
  natures: [ 1, 0.9, 1.1, 1, 1, 1 ],
  natureName: 'bold'
}
```