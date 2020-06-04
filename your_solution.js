
// Fix for reduced zappter-core
window.languages = {
    activeLang: 'en'
};

// Fix for reduced zappter-core
function label(t) {
    return t;
}

// Fix for reduced zappter-core
var loader = {
    start: function () { },
    stop: function () { }
};




$(document).ready(function () {



    var body = $("body"),
        container = $('<div class="container-fluid"><div class="row"></div></div>');

    body.append(container);

    // adding table plugin dynamically 
    // it should be loaded normally in index.html 
    // but based on instructions i should not to modify index.html 
    var tableScript = $('<script></script>');
    tableScript.attr('src', 'assets/js/zapp-core/table/table.js');
    body.append(tableScript);




    var newCustomer = function (editData, callback) {

        editData = mycz.helpers.isset(editData, true, true) ? editData : {};

        var isEdit = mycz.helpers.isset(editData, true, true);

        var f = new mycz.form('New Customer', {

            /**
             * Company Name
             */
            id: {
                type: 'text',
                new: true,
                edit: true,
                label: {
                    en: 'ID'
                },
                helper: {
                    en: 'Please enter your Id'
                },
                show_helper: true,
                formWidth: '100%'
            },
            /**
             * Company Name
             */
            first_name: {
                type: 'text',
                new: true,
                edit: true,
                label: {
                    en: 'First Name'
                },
                helper: {
                    en: 'Please enter your first name'
                },
                show_helper: true,
                formWidth: '100%'
            },
            /**
             * Company Name
             */
            last_name: {
                type: 'text',
                new: true,
                edit: true,
                label: {
                    en: 'Last Name'
                },
                helper: {
                    en: 'Please enter your last name'
                },
                show_helper: true,
                formWidth: '100%'
            },
            /**
             * Company Name
             */
            email: {
                type: 'text',
                new: true,
                edit: true,
                label: {
                    en: 'Email'
                },
                helper: {
                    en: 'Please enter your Email'
                },
                show_helper: true,
                formWidth: '100%'
            },
            /**
             * Company Name
             */
            telephone: {
                type: 'text',
                new: true,
                edit: true,
                label: {
                    en: 'Email'
                },
                helper: {
                    en: 'Please enter your Telephone'
                },
                show_helper: true,
                formWidth: '100%'
            },

            /**
             * Company Name
             */
            company_name: {
                type: 'text',
                new: true,
                edit: true,
                label: {
                    en: 'Company Name'
                },
                helper: {
                    en: 'Please enter your company name'
                },
                show_helper: true,
                formWidth: '100%'
            },
        }, editData, '', function (data) {
            if (mycz.helpers.isset(callback, true, true)) {
                callback(data);
            }

            f.close();

            mycz.toast.new(mycz.helpers.getText({
                en: 'New Customer Added',
                de: 'Neuer Kunde hinzugefügt'
            }), 'ion-ios-more-outline', 'info saving', '', 1000);
        }, isEdit);

        f.show();

    };


    var headerBuilder = function () {



        /**
         * node selector to header links
         * @type {object}
        */
        this.menu = null;

        /**
         * node selector to navbar
         * @type {object}
        */
        this.navbar = null;

        /**
         * node selector to header right action buttons
         * @type {object}
        */
        this.actionBtns = null;

        return {
            /**
             * construct html markup of header 
             * @return {headerBuilder}
            */
            constructHtml() {
                this.navbar = $('<nav></nav>');
                this.navbar.addClass(['navbar', 'navbar-expand', 'navbar-expand', 'navbar-dark', 'bg-dark'].join(' '));

                var brand = $('<a></a>');
                brand.attr('href', '#');
                brand.text('Zapp');
                brand.addClass('navbar-brand');

                var collapse = $('<div></div>');
                collapse.addClass(['collapse', 'navbar-collapse'].join(' '));

                this.menu = $('<ul></ul>');
                this.menu.addClass(['navbar-nav', 'mr-auto'].join(' '));


                this.actionBtns = $('<div></div>');
                this.actionBtns.addClass(['my-2', 'my-md-0'].join(' '));


                collapse.append([this.menu, this.actionBtns]);

                this.navbar.append([brand, collapse]);

                return this;
            },
            /**
             * Array of objects contains nav links
             * [ {text : /link title/ , href : /link destination/ } ]
             * @type {Array<object>}
             * @return {headerBuilder}
            */
            insertLinks(links) {
                var self = this;

                mycz.helpers.default(links, []).forEach(function (entry) {

                    var li = $('<li></li>');
                    li.addClass('nav-item');

                    var a = $('<a></a>');
                    a.addClass('nav-link');
                    a.attr('href', entry.href);
                    a.text(entry.text);


                    li.append(a);

                    self.menu.append(li);
                });

                return this;
            },
            /**
             * Add Button to list of button actions 
             * located at most right of navbar
             * @type text text
             * @type clickCb function
             * @return {headerBuilder}
            */
            addActionButton(text, clickCb) {

                var btn = $('<button></button>');
                btn.text('New Customer');
                btn.addClass(['btn', 'btn-primary'].join(' '));

                btn.on('click', clickCb);

                this.actionBtns.append(btn);

                return this;
            },
            /**
             * show header on page 
             * @return {headerBuilder}
            */
            show() {
                body.prepend(this.navbar);

                return this;
            }
        }
    }

    var sidebarBuilder = function () {



        /**
         * menu node selector to sidebar links
         * @type {object}
        */
        this.menu = null;

        /**
         * node selector to navbar
         * @type {object}
        */
        this.navbar = null;

        return {
            /**
             * construct html markup of sidebar 
             * @return {sidebarBuilder}
            */
            constructHtml() {
                this.navbar = $('<nav></nav>');
                this.navbar.addClass(['col-md-3', 'col-lg-2', 'd-md-block', 'bg-light', 'sidebar', 'collapse'].join(' '));

                var wrapper = $('<div></div>');
                wrapper.addClass(['position-sticky', 'pt-3'].join(' '));

                this.menu = $('<ul></ul>');
                this.menu.addClass(['nav', 'flex-column'].join(' '));


                wrapper.append(this.menu);

                this.navbar.append(wrapper);

                return this;
            },
            /**
             * Array of objects contains nav links
             * [ {text : /link title/ , href : /link destination/ } ]
             * @type {Array<object>}
             * @return {sidebarBuilder}
            */
            insertLinks(links) {
                var self = this;

                mycz.helpers.default(links, []).forEach(function (entry) {

                    var li = $('<li></li>');
                    li.addClass('nav-item');

                    var a = $('<a></a>');
                    a.addClass('nav-link');
                    a.attr('href', entry.href);
                    a.text(entry.text);


                    li.append(a);

                    self.menu.append(li);
                });

                return this;
            },
            /**
             * show sidebar on page 
             * @return {sidebarBuilder}
            */
            show() {
                container.find('.row').append(this.navbar);

                return this;
            }
        }
    }

    var steps = {

        /**
         * Creating the sidebar
         * @param callback function - If passed, will be triggered after sidebar is rendered
         */
        createSidebar: function (links, callback) {


            var builder = new sidebarBuilder;

            builder.constructHtml()
                .insertLinks(links)
                .show()

            if (mycz.helpers.isset(callback, true, true)) {
                callback();
            }

        },

        /**
         * Creating the header
         * @param entries array - An array of entries
         */
        createHeader: function (links, callback) {

            var builder = new headerBuilder;

            builder.constructHtml().insertLinks(links);

            builder.addActionButton('New Customer', function () {

                newCustomer(null, function (row) {

                    if (mycz.helpers.isset(window.tables["customers-table"], true, true)) {
                        window.tables["customers-table"].appendRow(row, true);
                    }

                });
            });

            builder.show();


            if (mycz.helpers.isset(callback, true, true)) {
                callback();
            }
        },

        /**
         * show table of customers
         * @param entries array - An array of entries
         */
        showCustomers: function (callback) {

            var header = ['Id', 'First Name', 'Last Name', 'Email', 'Telephone', 'Company Name'];

            var table = new mycz.table({
                id: "customers-table",
                header: header,
                offline: true,
                syncData: true,
                editable: true,
                storageKey: "customers"
            });


            // inserting table into container row column  
            var col = $('<div></div>');
            col.addClass(['col-md-9', 'ml-sm-auto', 'col-lg-10', 'px-md-4'].join(' '))

            col.append(table.getNode());

            container.find('.row').append(col);

            if (mycz.helpers.isset(callback, true, true)) {
                callback(table.getNode());
            }
        }
    };

    var links = [{ text: 'customer', href: '#' }];

    steps.createSidebar(links);
    steps.createHeader(links);
    steps.showCustomers();



});