


(function() {
  
        var Range           = ace.require("ace/range").Range;
        var log             = console.log.bind(console);
        var fileRegex       = /((?:https?:\/\/|www\.)(?:(?:[^\.\:])*(?:\.|\:))(?:[^:\/]+\/)*([^:\/]+)*)(?::(\d*))?(?::(\d*))?/; // extracts the line number at the end of a file in an error log
        var evalFileRegex   = /\((((?:[^):\/]+\/)*([^):\/]+)*)(?::(\d*))?(?::(\d*))?)/;
        
        var htmlEscape    = function(text, format){
        
              if(typeof text=="symbol"){
                    text = text.toString();
              }
              text    = text.replace(/&/g, "&amp;");
              text    = text.replace(/</g, "&lt;");
              text    = text.replace(/>/g, "&gt;");
              
              if(format===false){
                    return text;
              }
              if(!format){
                    return text.replace(/\n/g, "&crarr;");
              }
              
              text    = text.replace(/^(\s(?!\n))+/gm,m=>("<span style=display:inline-block;margin-left:"+m.length*10+"px></span>"));
              text    = text.replace(/\n/g, "<br>");
              text    = text.replace(/\t/g,"<span style=display:inline-block;margin-left:20px></span>");
              return text;
              
        }//htmlescape
        
        
        var maxLogLength              = 140;
        var maxHistoryLength          = 140;
        var maxObjectPreviewLength    = 60; //characters
        var maxStringPreviewLength    = 30; //characters
        
        var inputCodeTemplate =
            "<div class='js-console inputLine'>"              +
                "<div class='js-console inputArrow'></div>"   +
                "<div class='js-console inputCode'></div>"    +
                "<div style=clear:both></div>"                +
            "</div>";
            
        var outputTemplate =
            "<div class='js-console outputLine'>"             +
                "<div class='js-console outputIcon'></div>"   +
                "<div class='js-console outputData'></div>"   +
                "<div style=clear:both></div>"                +
            "</div>";
            
        var consoleTemplate =
            "<div class='js-console output'>"   +
            "</div>"                            +
            inputCodeTemplate.replace("inputCode","inputCode input");
    
        var dividerClass    = "ace_print-margin";
        var lBrace          = "<span class='ace_lparen'>{</span>";
        var rBrace          = "<span class='ace_rparen'>}</span>";
        var lBrack          = "<span class='ace_lparen'>(</span>";
        var rBrack          = "<span class='ace_rparen'>)</span>";
        var lSquareBrack    = "<span class='ace_lparen'>[</span>";
        var rSquareBrack    = "<span class='ace_rparen'>]</span>";
        var ddd             = "<span class='dotdotdot'>...</span>";
        var colon           = "<span class='ace_punctuation ace_operator'>:</span>";
        var comma           = "<span class='ace_punctuation ace_operator'>,</span>";
        var undef           = "<span class='ace_constant ace_language'>undefined</span>";
        var nul             = "<span class='ace_constant ace_language'>null</span>";
        var func            = "<span class=''>f</span>"+lBrack+rBrack;
        
        
        function getNumericText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") +" ace_constant ace_numeric'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getNumericText
        
        
        function getStringText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " ace_string'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
            
        }//getStringText
        
        
        function getRegexText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " ace_string'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getRegexText
        
        
        function getBooleanText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " ace_constant ace_language ace_boolean'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getBooleanText
        
        
        function getErrorText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " errorText'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getErrorText
        
        
        function getKeyText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " objectKey ace_constant ace_language'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getKeyText
        
        
        function getSymbolText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " objectSymbol ace_string ace_language'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getSymbolText
        
        
        function getKeySymbolText(val, clas) {
        
              return (
                  "<span class='" + (clas || "") + " objectKeySymbol ace_constant ace_language'>" +
                      htmlEscape(val.toString()) +
                  "</span>"
              ); //prettier-ignore
              
        }//getKeySymbolText
        
    
                                                                                  //some util functions
        function setupEditor(el, style, mode) {
        
              var editor = ace.edit(el);
              editor.setTheme("ace/theme/" + style);
              editor.getSession().setMode("ace/mode/" + mode);
              editor.getSession().setUseWrapMode(true);
              editor.getSession().setUseSoftTabs(true);
              editor.setShowPrintMargin(false);
              editor.setOptions({
                  maxLines: Infinity
              });
              editor.$blockScrolling = Infinity;
              editor.renderer.setShowGutter(false);
              editor.on("blur", function() {
                  editor.session.selection.clearSelection();
              });
              return editor;
              
        }//setupEditor
        
        
        function createCollapseEl(clas, parClass) {
          
              var element = define(
                  "<span class='js-console-collapsible js-console " + (parClass || "") +"'>"                          +
                      "<div class='js-console-collapsible header-outer js-console'>"                                  +
                          "<span class='js-console header-arrow'></span>"                                             +
                          "<div class='js-console-collapsible header js-console " + clas +"'></div>"                  +
                      "</div>"                                                                                        +
                      "<br>"                                                                                          +
                      "<div class='js-console-collapsible content js-console " +clas +"' style=display:none></div>"   +
                  "</span>"
              );
              
              var node    = element.querySelector(".header-outer").firstElementChild;
              
              node.onmouseup    = function(e){
              
                      if(e.button==0){
                                                                                  // Store the current scroll offset
                          var consoleEl   = closest(this,'.js-console.root');
                          var sh          = consoleEl.scrollHeight;
                          var h           = consoleEl.offsetHeight;
                          var st          = consoleEl.scrollTop;
                          var offset      = sh-h-st;
                                                                                  //  Expand or collapse
                          e.preventDefault();
                          
                          if(!element.classList.contains('.open')){
                              element.classList.add('open');
                              var node              = element.querySelector('.content');
                              var first             = node.firstElementChild;
                              first.style.display   = '';
                          }else{
                              element.classList.remove('open');
                              var node              = element.querySelector('.content');
                              var first             = node.firstElementChild;
                              first.style.display   = 'none';
                          }
      
                                                                                  //  Restore the current offset
                                                                                  //  (Relative to the bottom of the element)
                          var otop1             = element.offsetTop;
                          
                          var otop2             = consoleEl.offsetTop;
                          var oh2               = consoleEl.offsetHeight;
                          var stop2             = consoleEl.scrollTop;
                          var sh2               = consoleEl.scrollHeight;
                          
                          var maxScroll         = otop1-otop2+stop2;
                          var node              = element.querySelector('.header').firstElementChild;
                          var h3                = node.offsetHeight;
                          var minScroll         = maxScroll-h2+h3;
                                                                                  //  MaxScroll and minScroll make sure the element's
                                                                                  //  haeder never scrolls out of the screen
                          var t                 = sh2-oh2-offset;
                          var max               = Math.max(minScroll,h);
                          var min               = Math.min(maxScroll,max);
                          
                          consoleEl.scrollTop   = min;
                          
                      }
                      
                  }//onmouseup
                  
                  node.onmousedown    = function(e) {
                                                                                  //  Remove double click text selection:
                                                                                  //  https://stackoverflow.com/a/43321596
                      if(e.button==0 && e.detail>1){
                            e.preventDefault();
                      }
                      
                  }//onmousedown
                  
              return element;
            
        }//createCollapse
  
        
        function closest(el, selector) {
        
              while(el && el.nodeType===1){
              
                    if(el.matches(selector)){
                          return el;
                    }
                    el    = el.parentElement;
                    
              }//while
              return null;
              
        }//closest
  
        
        function specialObj(obj) {
        
              return (
                  obj instanceof Function ||
                  obj instanceof RegExp ||
                  obj instanceof Error
              );
              
        }//specialObj
        
        
        function getFileLocationElement(line, clas) {
          
              var fileMatch = line.match(fileRegex);
              var evalFileMatch = line.match(evalFileRegex);
              var out = {};
              if (fileMatch) {
                  var file = fileMatch[2] || "(index)";
                  var lineNumber = fileMatch[3] || "";
                  if (file && lineNumber) file += ":";
      
                  out.el = createCollapseEl("");
                  out.el
                      .find(".header")
                      .append(file.replace(/%20/g, " ") + lineNumber);
                  out.el
                      .children(".content")
                      .append(
                          "<a href='" + fileMatch[1] + "'>" +
                              fileMatch[0].replace(/%20/g, " ") +
                          "</a>"
                      ); // prettier-ignore
                  out.match = fileMatch;
                  out.start = fileMatch.index;
                  out.end = out.start + fileMatch[0].length;
              } else if (evalFileMatch) {
                  var file = evalFileMatch[3];
                  var lineNumber = evalFileMatch[4] || "";
                  if (file && lineNumber) file += ":";
      
                  out.el = createCollapseEl("");
                  out.el
                      .find(".header")
                      .append(file.replace(/%20/g, " ") + lineNumber);
                  out.el
                      .children(".content")
                      .append(evalFileMatch[1].replace(/%20/g, " "));
                  out.match = evalFileMatch;
                  out.end = evalFileMatch.index + evalFileMatch[0].length;
                  out.start = out.end - evalFileMatch[1].length;
              } else {
                  return;
              }
              out.lineNumber = lineNumber;
              out.file = file;
              out.el.addClass(clas);
              return out;
            
        }//getFileLocationElement
    
                                                                                  //data to be logged
        function DataObject(data, outputLineData, parent, name) {
        
            this.data             = data;
            this.element          = null;
            this.previewElement   = null;
            this.prefix           = "";
            this.outputLineData   = outputLineData;
            this.parent           = parent;
            this.name             = name;
            
        }//DataObject
  
        
        DataObject.prototype.getPreviewElement = function(prefix, depth) {
        
              if(prefix){
                    this.prefix   = prefix;
              }
              
              if(
                  this.data != null &&
                  typeof this.data == "object" &&
                  !specialObj(this.data)
              ){
                  return this.createObjectName(depth);
              }else{
                  return $(this.getNonObjectData(true));
              }
              
        };//getPreviewElement
        
        
        DataObject.prototype.getElement = function(prefix, depth) {
        
              var This          = this;
              var hadElement    = this.element;
              if(prefix){
                    this.prefix   = prefix;
              }
              if(depth==null){
                    depth   = 0;
              }
      
              if(this.data instanceof Error){
                    if(!this.element){
                          this.element    = createCollapseEl("errorMessage", "errorOutput");
                          this.element.find(".header").append(getErrorText(this.data));
                          var errorStack    = htmlEscape(this.data.stack, false);
                          var errorLines    = errorStack.split("\n");
                                                                                  //first line isn't needed
                          errorLines.shift();
                          errorLines.forEach(function(line) {
                          
                                var lineEl    = $("<span>");
                                This.element.children(".content").append(lineEl);
                                var file      = getFileLocationElement(line, "errorLocation");
                                if(file){
                                      lineEl.append(
                                          "<span margin-left:20px;>" +
                                              line.substring(0, file.start) +
                                              "</span>"
                                      );
                                      lineEl.append(file.el);
                                      lineEl.append(
                                          "<span>" + line.substring(file.end) + "</span><br>"
                                      );
                                } else {
                                      lineEl.append(
                                          "<span margin-left:20px;>" + line + "</span><br>"
                                      );
                                }
                                
                          });
                    }
              }else if(this.data != null && (typeof this.data=="object" || specialObj(this.data))){
                  var newElement    = false;
                  if(!this.element){
                        newElement    = true;
                        if(this.data){
                              var isArray   = this.data instanceof Array;
                              var isFunc    = this.data instanceof Function;
                        }
        
                        this.element    = createCollapseEl((isArray ? "array" : isFunc ? "function" : "object") +"Output");
                  }
      
                  if(depth<=1){
                        if(!this.previewElement){
                              if(specialObj(this.data)){
                                    this.previewElement   = this.getPreviewElement(this.prefix);
                              } else this.previewElement = this.createObjectName(0);
                        }
                        this.element
                            .find(".header")
                            .first()
                            .html("")
                            .append(this.previewElement);
                  }
                  if(depth==0){
                        this.createObjectData();
                  }else if(newElement){
                      this.element
                          .find(".header-outer")
                          .first()
                          .click(function(e) {
                          
                                var opens = This.element.is(".open");
                                if (opens) {
                                    This.getElement();
                                    if (!specialObj(This.data))
                                        This.element
                                            .find(".header")
                                            .first()
                                            .html(This.prefix);
                                } else {
                                    This.element.children(".content").html("");
                                    if (!specialObj(This.data))
                                        This.element
                                            .find(".header")
                                            .first()
                                            .html(This.previewElement);
                                }
                                
                          });
                  }
              }else{
                  if (!this.element) this.element = $(this.getNonObjectData());
              }
      
              if (!hadElement && this.element) {
                  this.element[0].data = this;
                  this.element.mouseup(function(e) {
                      if (e.button == 2) {
                          This.outputLineData.console.$trigger("rightClick", This);
                          e.stopImmediatePropagation();
                          e.preventDefault();
                      }
                  });
              }
      
              return this.element;
            
        };//getElement
        
        
        DataObject.prototype.getNonObjectData   = function(preview) {
          
              if (typeof this.data == "number")
                    return (
                        "<span class='numberOutput'>" +
                            this.prefix + getNumericText(this.data, "value") +
                        "</span>"
                    );
              else if (typeof this.data == "string") {
                    var text = this.data;
                    if (preview && text.length > maxStringPreviewLength)
                        text = text.substring(0, maxStringPreviewLength - 3) + "...";
                    // return "<span class='stringOutput'>"+this.prefix+getStringText('"'+text+'"', "value")+"</span>";
                    return (
                        "<span class='stringOutput'><table><tr>" + 
                            "<td>" +
                                this.prefix +
                            "</td>" +
                            "<td class=indent>" +
                                getStringText('"' + text + '"', "value") +
                            "</td>" +
                        "</tr></table></span>"
                    );
              } else if (typeof this.data == "boolean")
                    return (
                        "<span class='undefinedOutput'>" +
                            this.prefix + getBooleanText(this.data, "value") +
                        "</span>"
                    );
              else if (typeof this.data == "function")
                    return (
                        "<span class='functionOutput'>" + 
                            this.prefix + func + 
                        "</span>"
                    );
              else if (this.data instanceof RegExp)
                    return (
                        "<span class='regexOutput'>" +
                            this.prefix + getRegexText(this.data, "value") +
                        "</span>"
                    );
              else if (this.data === null)
                    return (
                        "<span class='nullOutput'>" + 
                            this.prefix + nul + 
                        "</span>"
                    );
              else if (this.data === undefined)
                    return (
                        "<span class='undefinedOutput'>" +
                            this.prefix + undef +
                        "</span>"
                    );
              else if (this.data instanceof Error)
                    return (
                        "<span class='errorOutput'>" +
                            this.prefix + getErrorText(this.data) +
                        "</span>"
                    );
              else if (typeof this.data == "symbol")
                    return (
                        "<span class='symbol'>" +
                            this.prefix + getSymbolText(this.data) +
                        "</span>"
                    );
                    
              return "<span class='rawOutput'>" + this.prefix + this.data + "</span>";
            
        }//getNonObjectData
        
        
        DataObject.prototype.createObjectData   = function() {
        
              var keys = Object.getOwnPropertyNames(this.data);
                                                                                  //  Symbols are still not universally supported.
                                                                                  //  But if they do exist, include in output
              if (Object.getOwnPropertySymbols)
                    keys = keys.concat(Object.getOwnPropertySymbols(this.data));
              if (this.data && this.data.__proto__ != Object.prototype)
                    keys.push("__proto__");
                    
              for (var i=0;i<keys.length;i++){
              
                  var key   = keys[i];
                  try {
                                                                                  //  try to catch arguments request on function
                      var obj;
                      if(this.getterObj && key!="__proto__"){
                            obj   = this.getterObj[key];
                      }else{
                            obj   = this.data[key];
                      }
      
                                                                                  // var obj = this.data[key];
                      var dObj    = new DataObject(obj,this.outputLineData,this,key);
                      if(key=="__proto__"){
                            dObj.getterObj    = this.getterObj || this.data;
                      }
      
                      this.element
                          .children(".content")
                          .append(
                              dObj.getElement(
                                  (typeof key == "symbol" ? getKeySymbolText(key) : getKeyText(key)) + colon + " ",
                                  1
                              )
                          ); //prettier-ignore
      
                      if(i<keys.length-1){
                            this.element.children(".content").append($("<br>"));
                      }
                      
                  }//try
                  catch(e){}
                  
              }//for
            
        };//createObjectData
        
        
        DataObject.prototype.createObjectName = function(depth) {
        
            var keys = Object.keys(this.data);
                                                                                  //  Symbols are still not universally supported.
                                                                                  //  But if they do exist, include in output
            if(Object.getOwnPropertySymbols){
                  keys    = keys.concat(Object.getOwnPropertySymbols(this.data));
            }
            var isArray     = this.data instanceof Array;
            var maxLength   = maxObjectPreviewLength;
            var previewEl   = define('<span></span>');
    
            previewEl.append(this.prefix);
            
            if(isArray){
                  previewEl.append("(" + keys.length + ") ");
            }else{
                  if(this.data.__proto__!=Object.prototype){
                        previewEl.append(this.data.__proto__.constructor.name+" ");
                  }
            }
            var html    = isArray ? lSquareBrack : lBrace;
            var node    = define(html);
            previewEl.append(node);
    
            if(depth<1){
                
                  var txt   = previewEl.textContent;
                  var n     = keys.length && txt.length<maxLength; 
                  
                  for(var i=0;i<n;i++){
                  
                        var key   = keys[i];
        
                        var obj;
                        if(this.getterObj && key!="__proto__"){
                              obj   = this.getterObj[key];
                        }else{
                              obj   = this.data[key];
                        }
        
                        var dObj    = new DataObject(obj);
                        if(key=="__proto__"){
                              dObj.getterObj    = this.getterObj || this.data;
                        }
        
                        if(i>0){
                              previewEl.append(comma+" ");
                        }
                        
                        var t   = isArray && key==i ? "" : htmlEscape(key)+colon+" ";
                        var r   = dObj.getPreviewElement(t,depth+1);
                        debugger;
                        previewEl.append(r);
                      
                  }//for
                  
                  if(i<keys.length){
                        previewEl.append(comma+" "+ddd);
                  }
                  
            }else{
                  previewEl.append(ddd);
            }
    
            var html    = isArray ? rSquareBrack : rBrace;
            var node    = define(html);
            previewEl.append(node);
            return previewEl;
            
        };//createObjectName
        
        
        DataObject.prototype.getPath = function() {
        
              if (this.parent) {
                  return this.parent.getPath() + "." + this.name;
              } else {
                  return this.outputLineData.dataObjects.indexOf(this) + "";
              }
              
        };//getPath
    
    
    
    
                                                                                    //console interface
        var Console = function(data,element){
        
              if (Object.keys(this).length == 0) {
              
                    if (!data) data = {};
        
                    var This        = this;
                    var el          = element;
                    el.innerHTML    = consoleTemplate;
                    el.classList.add("js-console","root");
                    element.oncontextmenu = function() {
                    
                            return false;
                            
                    };
        
                    if(!data)data               = {};
                    if(!data.theme)data.theme   = "xcode";
                    if(!data.mode)data.mode     = "javascript";
                    if(!data.style)data.style   = "light";
        
                                                                                    //create ace editors
                    this.outputEl       = el.querySelector(".output");
                    this.inputEditor    = setupEditor(el.querySelectorAll(".input")[0],data.theme,data.mode);
                    this.inputEditor.on("change", function() {
                    
                          el.scrollTop(el[0].scrollHeight);
                          setTimeout(function() {
                                                                                    //must wait some time for new line to process
                                el.scrollTop(el[0].scrollHeight);
                                
                          });
                          
                    });
                    
                                                                                    //key bindings
                    {
                    
                          this.inputEditor.commands.addCommand({
                                name: "enter",
                                bindKey: { win: "Enter", mac: "Enter" },
                                exec: function(editor) {
                                
                                    This.$handleInput();
                                    return true;
                                    
                                }//exec
                          });
                            
                          this.inputEditor.commands.addCommand({
                              name: "arrowUp",
                              bindKey: { win: "Up", mac: "Up" },
                              exec: function(editor) {
                              
                                    if (editor.selection.getCursor().row == 0) {
                                        This.$prevHistory();
                                        return true;
                                    }
                                    return false;
                                    
                              }//exec
                          });
                          
                          this.inputEditor.commands.addCommand({
                              name: "arrowDown",
                              bindKey: { win: "Down", mac: "Down" },
                              exec: function(editor) {
                              
                                    if (
                                        editor.selection.getCursor().row ==
                                        editor.session.getLength() - 1
                                    ) {
                                        This.$nextHistory();
                                        return true;
                                    }
                                    return false;
                                    
                              }//exec
                          });
                          
                          this.inputEditor.commands.addCommand({
                              name: "terminate",
                              bindKey: { win: "Ctrl-C", mac: "Cmd-C" },
                              exec: function(editor) {
                              
                                    var range = editor.selection.getRange();
                                    if (
                                        range.start.row == range.end.row &&
                                        range.start.column == range.end.column
                                    ) {
                                        if (This.$trigger("terminate")) {
                                            This.warn("Code execution terminated");
                                        }
                                        return true;
                                    }
                                    return false;
                                    
                              }//exec
                          });
                          
                    }
                    
                    el.classList.add("ace-"+data.theme,data.style);
        
                                                                                    //FIX: "Input element isn't focussed when 
                                                                                    //clicking in the history element #5"
                    el.click(function(e) {
                    
                          if (window.getSelection().toString() == "")
                                This.inputEditor.focus();
                                
                    });
        
                                                                                    //create variables needed to manage the console
                    this.data               = data;
                    this.outputs            = [];
                    this.inputs             = [];
                    this.elementLog         = [];
                    this.historyIndex       = 0;
                    this.element            = element;
                    this.maxLogLength       = maxLogLength;
                    this.maxHistoryLength   = maxHistoryLength;
                    this.showIcons          = data.showIcons||false;
                    this.messageID          = 0;
                    this.listeners          = {
                                                    input           : [],
                                                    elementRemove   : [],
                                                    rightClick      : [],
                                                    terminate       : []
                                              };
                                                                                    //setup passed listeners
                    var keys    = Object.keys(this.listeners);
                    for(var i=0;i<keys.length;i++){
                    
                          var key = keys[i];
                          var name = "on" + key[0].toUpperCase() + key.substring(1);
                          if (this.data[name]) this[`on${key}`]=this.data[name];
                          
                    }//for
              }else{
                    if (!this[0].console) this[0].console = new Console(data, this[0]);
                    return this[0].console;
              }
              
        }//console
        
        
        Console.prototype.$handleInput = function(force) {
        
              var text      = this.inputEditor.getValue();
              var elData    = this.input(text);
              if(!this.$trigger("input",text)||force){
                    this.inputEditor.setValue("",-1);
              }else{
                    this.$removeElement(elData.element);
              }
              
        }//$handleInput
        
        
        Console.prototype.input = function(text) {
        
              var el    = $(inputCodeTemplate);
              this.outputEl.append(el);
              var editor    = setupEditor(el.find(".inputCode")[0],this.data.theme,this.data.mode);
              editor.setReadOnly(true);
              editor.renderer.$cursorLayer.element.style.display    = "none";
              editor.setValue(text,-1);
      
                                                                                    //  FIX: "Input element isn't focussed when clicking
                                                                                    //  in the history element #5"
              var ThisConsole   = this;
              
              el.find("*").click(function(e) {
              
                    if(editor.getSelectedText()==""){
                          ThisConsole.inputEditor.focus();
                    }
                    
              });
      
              var dataObj = {
                    text      : text,
                    type      : "input",
                    element   : el,
                    editor    : editor,
                    id        : this.messageID++,
                    console   : this
              };
              
              var prevInp   = this.inputs[this.inputs.length-1];
              if(!prevInp||text!=prevInp.text){
                    this.inputs.push(dataObj);
              }
              this.elementLog.push(dataObj);
              this.historyIndex   = this.inputs.length;
                                                                                    //  remove history if the limit has been reached
              this.$removeHistory(); 
                                                                                    //  remove elements if the limit has been reached
              this.$removeElement(); 
              return dataObj;
              
        }//input
        
        
        function define(html){
        
              var host          = document.createElement('div');
              host.innerHTML    = html;
              var node          = host.firstElementChild;
              return node;
              
        }//define
        
        
        Console.prototype.$print    = function(clas){
          
              var st            = this.element.scrollTop;
              var sh            = this.element.scrollHeight;
              var h             = this.element.offsetHeight;
              
              var max           = sh-h-10;
              var isMaxScroll   = (st>=max);
              
              
              var el            = define(outputTemplate);
              var out           = el.querySelector('.outputData');
      
              var objects       = Array.from(arguments);
              objects.shift();
              var dataObj   = {
                    objects   : objects,
                    type      : clas,
                    element   : el,
                    id        : this.messageID++,
                    console   : this
              };
      
              var dataObjects   = [];
              for(var i=1;i<arguments.length;i++){
              
                    var arg = arguments[i];
                    if(
                          arg instanceof Console.LineNumber ||
                          arg instanceof Console.PlainText ||
                          arg instanceof Console.HtmlElement
                    ){
                          out.append(arg.element);
                    }else{
                          var dataObject    = new DataObject(arg,dataObj);
                          dataObjects.push(dataObject);
                          out.append(dataObject.getElement());
                    }
                    
              }//for
      
              el.classList.add(clas);
              if(this.showIcons){
                    el.classList.add("ace_gutter-cell ace_" + (clas == "warn" ? "warning" : clas));
              }
      
              this.outputEl.append(el);
              if(isMaxScroll){
                                                                                  //  scroll all the way down if it was all the way down
                    this.element.scrollTop    = this.element.scrollHeight; 
              }
      
              dataObj.dataObjects   = dataObjects;
              this.outputs.push(dataObj);
              this.elementLog.push(dataObj);
                                                                                  //  remove elements if the limit has been reached
              this.$removeElement();
              return dataObj;
            
        }//$print
        
        
        Console.prototype.output = function() {
        
              var args    = Array.from(arguments);
              args.unshift('return');
              var ret     = this.$print.apply(this, args);
              var el      = ret.element;
              var node    = define("<div class='"+dividerClass+"'></div>");
              el.append(node);
              return ret;
              
        }//output
        
        
        Console.prototype.log = function() {
          
              var prevPrint = this.$getLastPrint();
              //increment log counter code
              {
                  outer: if (prevPrint && prevPrint.element.is(".log")) {
                      if (arguments.length == prevPrint.arguments.length) {
                          //check if arguments are identical
                          for (var i = 0; i < arguments.length; i++) {
                              var arg = arguments[i];
                              var lastArg = prevPrint.arguments[i];
                              if (arg == lastArg) continue;
                              if (
                                  arg instanceof Console.LineNumber &&
                                  lastArg instanceof Console.LineNumber &&
                                  arg.element.text() == lastArg.element.text()
                              )
                                  continue;
                              break outer;
                          }
      
                          //increment counter
                          var icon = prevPrint.element.find(".outputIcon");
                          icon.addClass("number");
                          var number = (parseInt(icon.text()) || 1) + 1;
                          icon.text(number);
                          prevPrint.element
                              .find(".outputData")
                              .css(
                                  "max-width",
                                  "calc(100% - " + icon.outerWidth(true) + "px)"
                              );
                          return;
                      }
                  }
              }
      
              var args = Array.from(arguments);
              this.$makeStringsPlain(args);
              args.unshift("log");
      
              var ret = this.$print.apply(this, args);
              ret.arguments = Array.from(arguments); //append arguments for increment log counter process
      
              this.$addDivider(ret.element);
      
              return ret;
            
        }//log
        
        
        Console.prototype.error = function() {
        
              var args = Array.from(arguments);
              this.$makeStringsPlain(args);
              args.unshift("error");
              return this.$print.apply(this, args);
              
        }//error
        
        
        Console.prototype.warn = function() {
        
              var args = Array.from(arguments);
              this.$makeStringsPlain(args);
              args.unshift("warn");
              return this.$print.apply(this, args);
              
        }//warn
        
        
        Console.prototype.info = function() {
        
              var args = Array.from(arguments);
              this.$makeStringsPlain(args);
              args.unshift("info");
              return this.$print.apply(this, args);
              
        }//info
        
        
        Console.prototype.clear = function() {
        
              while (this.elementLog.length > 0) {
                  if (!this.$removeElement(0)) break;
              }
              return this;
              
        }//clear
        
        
        Console.prototype.time = function(label) {
        
              var now = new Date();
              if (!this.timers) this.timers = {};
              if (!label || typeof label != "string") label = "default";
              this.timers[label] = now;
              
        }//time
        
        
        Console.prototype.timeEnd = function(label) {
        
              var now = new Date();
              if (!this.timers) this.timers = {};
      
              var args = Array.from(arguments);
              if (!label || typeof label != "string") {
                  label = "default";
              } else {
                  args.shift();
              }
              this.$makeStringsPlain(args);
      
              if (!this.timers[label]) {
                  args.unshift("timeEnd", new Console.PlainText(label + ": 0ms"));
              } else {
                  var diff = now - this.timers[label];
                  args.unshift(
                      "timeEnd",
                      new Console.PlainText(label + ": " + diff + "ms")
                  );
                  delete this.timers[label];
              }
      
              var ret = this.$print.apply(this, args);
              this.$addDivider(ret.element);
              return ret;
            
        }//timeEnd
        
        
        Console.prototype.$removeElement = function(element) {
          
              if(element==null){
                                                                                    //  remove until below threshold
                  while (this.elementLog.length > this.maxLogLength) {
                  
                        if (!this.$removeElement(0)) break;
                        
                  }//while
                  return;
              }
      
              var obj;
              var index;
              if(typeof element=="number"){
                  obj     = this.elementLog[element];
                  index   = element;
              }else{
                  element   = element.closest(".js-console.outputLine,.js-console.inputLine")[0];
                  
                  outer: for (var i = 0; i < this.elementLog.length; i++) {
                  
                        var e = this.elementLog[i];
                        if (e.dataObjects) {
                            for (var j = 0; j < e.dataObjects.length; j++) {
                                var d = e.dataObjects[j];
                                if (d.element[0] == element) {
                                    obj = e;
                                    index = i;
                                    break outer;
                                }
                            }
                        } else {
                            if (e.element[0] == element) {
                                obj = e;
                                index = i;
                                break outer;
                            }
                        }
                        
                  }//for
              }
      
              if(obj){
                  if(this.$trigger("elementRemove", obj)){
                        return;
                  }
      
                  if(obj.dataObjects){
                                                                                    //output object
                      var index   = this.outputs.indexOf(obj);
                      if(index!=-1){
                            this.outputs.splice(index, 1);
                      }
                      obj.element.remove();
                  }else{
                                                                                    //input object
                      obj.disposed = true;
                      obj.element.remove();
                      obj.editor.destroy();
                  }
      
                  this.elementLog.splice(index, 1);
                  return true;
              }
            
        }//$removeElement
        
        
        Console.prototype.$removeHistory = function(element) {
        
              if (element == null) {
                                                                                    //  remove untill below threshold
                  while(this.inputs.length>this.maxHistoryLength){
                  
                      if(!this.$removeHistory(0)){
                            break;
                      }
                      
                  }//while
                  return;
              }
      
              var obj;
              var index;
              
              if(typeof element=="number"){
                  index   = element;
                  obj     = this.inputs[element];
              }else{
                  element   = element.closest(".js-console.inputLine")[0];
                  for(var i=0;i<this.inputs.length;i++){
                  
                      var e   = this.inputs[i];
                      if(e.element[0]==element){
                          index   = i;
                          obj     = e;
                          break;
                      }
                  }
              }
      
              if(obj){
                    this.inputs.splice(index,1);
                    if(this.historyIndex>index){
                          this.historyIndex--;
                    }
                    return true;
              }
              
        };//$removeHistory
        
        
        Console.prototype.$prevHistory    = function(){
        
              if(this.historyIndex==this.inputs.length){
                    this.tempHist = this.inputEditor.getValue();
              }
      
              this.historyIndex   = Math.max(this.historyIndex-1,0);
      
              var h   = this.inputs[this.historyIndex];
              if(h&&h.text){
                    this.inputEditor.setValue(h.text,1);
                                                                                      //  select last column of first line
                    var fl = h.text.split("\n")[0].length; 
                    this.inputEditor.selection.setRange(new Range(0,fl,0,fl));
              }
              return this;
            
        };//$prevHistory
        
        
        Console.prototype.$nextHistory = function() {
        
              if (this.historyIndex == this.inputs.length)
                  this.tempHist = this.inputEditor.getValue();
      
              this.historyIndex = Math.min(this.historyIndex + 1, this.inputs.length);
      
              if (this.historyIndex == this.inputs.length) {
                  this.inputEditor.setValue(this.tempHist, 1);
              } else {
                  var h = this.inputs[this.historyIndex];
                  if (h && h.text) this.inputEditor.setValue(h.text, 1);
              }
              return this;
              
        };//$nextHistory
        
        
        Console.prototype.$getLastPrint = function() {
        
              return this.elementLog[this.elementLog.length - 1];
              
        };//$getLastPrint
        
        
        Console.prototype.$makeStringsPlain = function(args) {
        
              for (var i = 0; i < args.length; i++){
              
                    if(typeof args[i]=="string" && args[i].length>0){
                          args[i]   = new Console.PlainText(args[i]);
                    }
                        
              }//for
              
        };//$makeStringsPlain
        
        
        Console.prototype.$addDivider = function(element) {
        
              var data = this.elementLog[this.elementLog.length - 2];
              if (data && data.element.is(".inputLine")) {
                  element.prepend("<div class='" + dividerClass + "'></div>");
              }
              element.append("<div class='" + dividerClass + "'></div>");
              
        };//$addDivider
        
        
                                                                                    // console events
        Console.prototype.onInput = function(func, remove) {
        
              this.on("input", func, remove);
              
        };//onInput
        
        
        Console.prototype.onElementRemove = function(func, remove) {
        
              this.on("elementRemove", func, remove);
              
        };//onElementRemove
        
        
        Console.prototype.onRightClick = function(func, remove) {
        
              this.on("rightClick", func, remove);
              
        };//onRightClick
        
        
        Console.prototype.onTerminate = function(func, remove) {
        
              this.on("terminate", func, remove);
              
        };//onTerminate
        
        
        Console.prototype.on = function(event, func, remove) {
        
              var listeners = this.listeners[event];
              if (listeners) {
                  if (remove) {
                      var index = listeners.indexOf(func);
                      if (index >= 0) listeners.splice(index, 1);
                  } else {
                      listeners.push(func);
                  }
              }
              
        };//on
        
        
        Console.prototype.$trigger = function(event) {
        
              var listeners = this.listeners[event];
              if (listeners) {
                  var args = Array.from(arguments);
                  args.shift();
      
                  var out = undefined;
                  for (var i = 0; i < listeners.length; i++) {
                      var listener = listeners[i];
                      var ret = listener.apply(this, args);
                      if (ret !== undefined) out = ret;
                  }
      
                  return out;
              }
              return false;
              
        };//$trigger
    
    
                                                                                    // special log input objects
        Console.LineNumber = function(file, lineNumber, trace) {
        
              if(typeof file == "number"){
                                                                                    //  figure out the file from stack trace
                    var nodes   = new Error("").stack.split("\n");
                    nodes.shift();
                    var node    = nodes[Math.min(nodes.length-1,file)];
                    trace       = node;
                    file        = "";
              }
      
              file          = htmlEscape(file || "");
              lineNumber    = lineNumber!=null ? lineNumber : "";
      
              if(trace){
                    var fileData    = getFileLocationElement(trace, "lineNumber");
                    if(fileData){
                          this.element      = fileData.el;
                          this.file         = fileData.file;
                          this.lineNumber   = fileData.lineNumber;
                    }else{
                          this.element    = $("<span class=lineNumber>&lt;anonymous&gt;</span>");
                    }
              }else{
                    var spacer      = file!="" && lineNumber!="" ? ":" : "";
                    this.element    = $("<span class=lineNumber>"+file+spacer+lineNumber+"</span>");
              }
      
              this.file         = file;
              this.lineNumber   = lineNumber;
              
        };//LineNumber
        
        
        Console.prototype.LineNumber    = Console.LineNumber;
        
        Console.PlainText   = function(text){
        
            this.text       = text;
            this.element    = $("<span class='js-console plainText'>" +htmlEscape(text, true) +"</span>");
            
        };//PlainText
        
        
        Console.prototype.PlainText   = Console.PlainText;
        
        Console.HtmlElement   = function(element) {
        
              this.element = element;
              
        };//HtmlElement
        
        
        Console.prototype.HtmlElement   = Console.HtmlElement;
    
        //$.fn.console = Console;
    
        return Console;
    
})();
