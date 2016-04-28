var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');

var UserRow = React.createClass({
    handleChange: function () {
      this.props.handleUserInput(this.refs.isAttendingInput.checked);
  },

  render: function() {
    var priority = this.props.user.coop ?
    <span style={{ color: '#ccc' }}>N/A (co-op)</span> :
    <strong>{this.props.user.priority}</strong>;
    return (
        <tr>
        <td><input
        type="button"
        value="X"
        onClick={this.props.removeMember}
        /></td>
        <td><strong>{this.props.user.name}</strong></td>
        <td>{priority}</td> 
        <td><input
        type="checkbox"
        checked={this.props.user.attending}
        ref="isAttendingInput"
        onChange={this.handleChange}
        /></td>
        </tr>
        );
}
});

var UserTable = React.createClass({
    handleUserInput: function(i, bool) {
      this.props.users[i].attending = bool;
      this.props.handleUserInput(this.props.users);
  },

  removeMember: function(i) {
    var confirm = window.confirm("Are you sure you want to remove " + this.props.users[i].name + "?\nAll information about him/her will be wiped.");
    if (confirm)
        this.props.removeMember(i);
},

render: function() {
    var rows = [];
    this.props.users.forEach(function(user, i) {
        rows.push(<UserRow user={user} key={user.name} removeMember={this.removeMember.bind(this, i)} handleUserInput={this.handleUserInput.bind(this,i)}/>);
    }.bind(this));
    return (
        <table>
        <thead>
        <tr>
        <th></th>
        <th>Name</th>
        <th>Captaincy Priority</th>
        <th>Attending</th>
        </tr>
        </thead>
        <tbody id="tbody">{rows}</tbody>
        </table>
        );
}
});

// var SearchBar = React.createClass({
//     handleChange: function() {
//         this.props.onUserInput(
//             this.refs.filterTextInput.value,
//             this.refs.inStockOnlyInput.checked
//         );
//     },
//     render: function() {
//         return (
//             <form>
//                 <input
//                     type="text"
//                     placeholder="Search..."
//                     value={this.props.filterText}
//                     ref="filterTextInput"
//                     onChange={this.handleChange}
//                 />
//                 <p>
//                     <input
//                         type="checkbox"
//                         checked={this.props.inStockOnly}
//                         ref="inStockOnlyInput"
//                         onChange={this.handleChange}
//                     />
//                     {' '}
//                     Only show products in stock
//                 </p>
//             </form>
//         );
//     }
// });

var GreaterUserTable = React.createClass({
    getInitialState: function() {
        return {
          users: this.props.users
      };
  },

// componentDidMount: function() {
//     $.get(this.props.source, function(result) {
//         var userList = result[0];
//         console.table(userList);
//         if (this.isMounted()) {
//             this.setState({
//                 users: userList
//             })
//         }
//     }.bind(this));
// },

handleUserInput: function (users) {
    this.setState({
      users: users
  });
},

saveList: function () {
    $.post("write.php", {json : JSON.stringify(this.state.users)});
},

display: function() {
    document.getElementById("addMember").style = "display: block";
},

addMember: function() {
    var name = document.getElementById("name").value;
    if (name.replace(" ", "")=="")
        return;
    var coop = document.getElementById("coop").checked;

    var newMember = {name: name, "coop": coop, priority:0, attending:true};
    this.props.users.push(newMember);

    /* sort by name */
    this.props.users.sort(function(a, b){
        if(a.name < b.name) return -1;
        if(a.name > b.name) return 1;
        return 0;
    });

    this.setState({
      users: this.props.users
  });
    this.saveList();

    document.getElementById("addMember").style = "display: none";
},

removeMember: function(i) {
    if (i!=-1) {
        this.props.users.splice(i, 1);

        this.setState({
          users: this.props.users
      });
        this.saveList();
    }
},

findUser: function(name) {
    for (var i=0; i<this.props.users.length; i++) {
        if (this.props.users[i].name==name)
            return i;
    }
    return -1;
},

render: function() {
    return (
        <div>
        <UserTable
        users={this.props.users}
        handleUserInput={this.handleUserInput}
        removeMember={this.removeMember}
        /><br/>
        <input
        type="button"
        value="Save List"
        onClick={this.saveList}
        />
        <input
        type="button"
        value="Add member"
        onClick={this.display}
        />
        <div id="addMember" style={{display: "none"}}><br/><br/>Name:<input type="text" id="name"/>  Coop?<input type="checkbox" id="coop"/><input type="button" value="Submit" onClick={this.addMember}/><br/><br/>
        </div><br/>
        <p style={{fontSize:12}}>***DONT FORGET TO SAVE THE LIST!!! OTHERWISE IT WON'T BE OVERWRITTEN!***</p>
        </div>
        );
}
});

// var FilterableProductTable = React.createClass({
//     getInitialState: function() {
//         return {
//             filterText: '',
//             inStockOnly: false
//         };
//     },
//
//     handleUserInput: function(filterText, inStockOnly) {
//         this.setState({
//             filterText: filterText,
//             inStockOnly: inStockOnly
//         });
//     },
//
//     render: function() {
//         return (
//             <div>
//                 <SearchBar
//                     filterText={this.state.filterText}
//                     inStockOnly={this.state.inStockOnly}
//                     onUserInput={this.handleUserInput}
//                 />
//                 <ProductTable
//                     products={this.props.products}
//                     filterText={this.state.filterText}
//                     inStockOnly={this.state.inStockOnly}
//                 />
//             </div>
//         );
//     }
// });


// var PRODUCTS = [
//   {category: 'Sporting Goods', price: '$49.99', stocked: true, name: 'Football'},
//   {category: 'Sporting Goods', price: '$9.99', stocked: true, name: 'Baseball'},
//   {category: 'Sporting Goods', price: '$29.99', stocked: false, name: 'Basketball'},
//   {category: 'Electronics', price: '$99.99', stocked: true, name: 'iPod Touch'},
//   {category: 'Electronics', price: '$399.99', stocked: false, name: 'iPhone 5'},
//   {category: 'Electronics', price: '$199.99', stocked: true, name: 'Nexus 7'}
// ];

$.getJSON("users.json", function() {

}).success(function(data) {
    var userList = data;

    /* sort by name */
    userList.sort(function(a, b){
        if(a.name < b.name) return -1;
        if(a.name > b.name) return 1;
        return 0;
    });

    ReactDOM.render(
// <FilterableProductTable products={PRODUCTS} />,
<GreaterUserTable users={userList} />,
document.getElementById('container')
)}).error(function(jqXHR, textStatus, errorThrown) {
    console.log("error " + textStatus);
    console.log("incoming Text " + jqXHR.responseText);
});

