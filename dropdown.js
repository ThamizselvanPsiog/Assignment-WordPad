const logbtn=document.getElementById("logo");
const dropdown=document.querySelector(".dropdown-content");

logbtn.addEventListener("click",()=>{
    dropdown.classList.toggle("show");
});

dropdown.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click",()=>{
        const action=btn.dataset.action;
        if(window.editorInstance){
            window.editorInstance.executeCommand(action);
        }
        dropdown.classList.remove("show");
    })
})