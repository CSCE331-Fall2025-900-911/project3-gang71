Web App for Kung Fu Tea  
Contributors: Claire Wu, Jayani Singh, Vaidehi Singhal, Sarah Muyshondt, Anna Williamson, Haajirah Siddiqi

To deploy, run this once:
git remote add render https://github.com/yclairew project3-gang71
git push -u render 

After the first time, everyone can just do git push.


To build:
npm install

To start:
node index.js

Link: https://project3-gang71.onrender.com/



to create branch & then merge with main  
git checkout -b your-branch-name  
git add .  
git commit -m "Describe your changes"  
git push --set-upstream origin branch1  
git push  

IN GITHUB  
Open a Pull Request (PR) on GitHub  
Base branch = main  
Compare branch = your-branch-name  
Add a title + description → Create pull request  

Merge into main  
After review/approval → click Merge pull request on GitHub  
Optionally, delete your branch on GitHub  

git checkout main  
git pull origin main (Make sure to pull every time before making any changes!)

git checkout branchName  
git pull origin main --no-rebase (Make sure to pull every time before making any changes!)  

(optional) git branch -d your-branch-name  (this will delete your branch)
