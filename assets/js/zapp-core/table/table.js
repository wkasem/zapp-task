/**
 * A new consolidated table-function.
 * U must create a new instance: new mycz.table();
 *
 * @param opts.id string - helps to select this instance anywhere in the code
 * @param opts.offline boolean - whether to load data from local or through ajax
 * @param opts.syncData boolean - whether to save edited and new data to data store
 * @param opts.editable boolean - make table cells editable or not 
 * @param opts.storageDriver object - diver class which handling setting and getting the data
 * @param opts.onDataChanged function - Callback to be called after and cell data changed
 * @returns {mycz.table}
 */
mycz.table = function (opts) {

     /**
      * node selector for scroll container for table
      * @type {object}
     */
     this.container = null;

     /**
      * node selector for the table
      * @type {object}
     */
     this.table = null;

     /**
      * node selector for the table body
      * @type {object}
     */
     this.tableBody = null;

     /**
      * node selector for the table header
      * @type {object}
     */
     this.tableHead = null;

     /**
      * table data store
      * @type {Array}
     */
     this.data = [];


     var self = this;

     this.opts = $.extend({
          id: null,
          offline: false,
          syncData: false,
          editable: false,
          storageDriver: mycz.storage,
          onDataChanged: $.noop
     }, opts)



     /**
     * Get Initial Data from data store
     * @returns {Promise}
     */
     this.getData = function () {

          return new Promise(function (resolve, reject) {
               if (self.opts.offline) {
                    mycz.try(function () {
                         resolve(
                              mycz.helpers.json.parse(
                                   mycz.helpers.default(self.opts.storageDriver.get(self.opts.storageKey), "[]")
                              )
                         );
                    }, function (err) {
                         reject(err);
                    })

               }

               //TODO : online fetching
          })


     }

     /**
     * create new table tag and assign it 
     * to table attribute to be used later 
     * to insert other table components
     */
     this.drawTable = function () {

          this.container = $('<div class="overflow-auto"></div>')

          this.table = $('<table class="table"></table>');

          this.container.append(this.table);
     }

     /**
     * append initial thead tag to the table
     * and inserting head columns
     */
     this.drawHead = function () {
          var tableHead = $('<thead><tr></tr></thead>');

          this.table.append(tableHead);

          this.opts.header.forEach(function (t) {

               tableHead.find('tr').append('<th>' + t + '</th>');
          });
     }

     /**
     * append initial tbody tag to the table 
     * and start inserting rows into able
     */
     this.drawBody = function () {

          this.tableBody = $('<tbody></tbody>');

          this.table.append(this.tableBody);

          this.data.forEach(function (row) { self.appendRow(row) });

     }

     /**
     * add new row to the table 
     * 
     * @param row object - containing data for table row
     * @param newRow boolean - should be saved to data store or not 
     */
     this.appendRow = function (row, newRow = false) {

          var tr = $('<tr></tr>');

          this.tableBody.append(tr);

          Object.keys(row).forEach(function (key) {
               var content = $('<div></div>'),
                    td = $('<td></td>');


               if (self.opts.editable) {

                    var inputFn = mycz.helpers.debounce(function () {

                         var value = $(this).text();

                         row[key] = value;

                         self.opts.onDataChanged({ key: key, value: value }, row);

                         if (self.opts.syncData) self.syncData(row);

                    }, 1000);

                    content.attr('contenteditable', true);

                    content.on('input', inputFn);
               }


               if (newRow) self.syncData(row);

               content.text(row[key]);

               td.append(content);
               tr.append(td);
          });
     }

     /**
     * Save data to data store 
     * @param row object - containing data for table row 
     */
     this.syncData = function (row) {

          // if not exists in data store ; append it as a new row
          var index = this.data.indexOf(row) == -1 ? this.data.length : this.data.indexOf(row);

          this.data[index] = row;

          self.opts.storageDriver.set(self.opts.storageKey, mycz.helpers.json.stringify(this.data));
     }

     /**
     * start drawing table 
     * @returns {mycz.table}
     */
     this.init = function () {

          window.tables = mycz.helpers.default(window.tables, {});

          if (mycz.helpers.isset(window.tables[this.opts.id], true, true)) {

               throw new Error("Table with this id " + this.opts.id + " has been created before")
          }

          this.drawTable();
          this.drawHead();

          this.getData().then(function (data) {
               self.data = data;

               self.drawBody();
          });

          window.tables[this.opts.id] = this;

          return this;
     }

     /**
     * get Table Node selector 
     * @returns {mycz.table}
     */
     this.getNode = function () {


          return this.container;
     }

     /**
     * remove table from page
     * @returns {mycz.table}
     */
     this.destroy = function () {

          this.container.remove();

          delete window.tables[this.opts.id];
     }


     return this.init();

}
